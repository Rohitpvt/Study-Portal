"""
app/services/contribution_service.py
──────────────────────────────────────
Handles the full contribution lifecycle:
  submit → AI review (background) → admin decision → publish as Material
"""

from typing import Optional

from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime
from app.models.contribution import Contribution, ContributionStatus, ProcessingStatus, FinalRecommendation
from app.models.material import Category, Material, ConversionStatus
from app.models.user import User
from app.models.base import generate_uuid
from app.schemas.contribution import ContributionCreate, PaginatedContributions, ReviewDecision
from app.utils.file_handler import get_storage
from app.utils.document_converter import convert_to_pdf


async def submit_contribution(
    payload: ContributionCreate,
    file: UploadFile,
    contributor: User,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
) -> Contribution:
    """
    Accept a student file upload, persist it, and queue the AI review.
    Returns immediately — AI processing happens asynchronously.
    """
    # ── Non-destructive Dual-Key Storage ──────────────────────────────────────
    storage = get_storage()

    # Read file bytes ONCE up front (UploadFile stream is consumed after first read)
    original_bytes = await file.read()
    await file.seek(0)  # Reset for storage.upload_file() which also reads

    # 1. Always store the original file
    try:
        stored_original = await storage.upload_file(file, folder="contributions")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Primary storage failed: {e}. Falling back to LocalStorage.")
        from app.utils.file_handler import LocalStorage
        from app.core.config import settings
        storage = LocalStorage(base_dir=settings.UPLOAD_DIR)
        await file.seek(0)
        stored_original = await storage.upload_file(file, folder="contributions")

    # 2. Attempt PDF conversion (using the bytes we already captured)
    pdf_stored = None
    conversion_status = ConversionStatus.SUCCESS if file.filename.lower().endswith(".pdf") else ConversionStatus.PENDING
    
    if conversion_status == ConversionStatus.PENDING:
        try:
            pdf_bytes = await convert_to_pdf(original_bytes, file.filename)
            if pdf_bytes:
                import io
                pdf_filename = f"{file.filename.rsplit('.', 1)[0]}.pdf"
                pdf_upload = UploadFile(
                    file=io.BytesIO(pdf_bytes),
                    filename=pdf_filename
                )
                pdf_upload.content_type = "application/pdf"
                
                try:
                    pdf_stored = await storage.upload_file(pdf_upload, folder="contributions/previews")
                    conversion_status = ConversionStatus.SUCCESS
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to store converted PDF for contribution: {e}")
                    conversion_status = ConversionStatus.FAILED
            else:
                conversion_status = ConversionStatus.FAILED
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"PDF conversion crashed for contribution: {e}")
            conversion_status = ConversionStatus.FAILED

    # The 'file_key' remains the primary access point (PDF if available, else original)
    primary_stored = pdf_stored if pdf_stored else stored_original

    contribution = Contribution(
        id=generate_uuid(),
        title=payload.title,
        description=payload.description,
        subject=payload.subject,
        course=payload.course,
        semester=payload.semester,
        category=payload.category,
        
        # Legacy/Primary compatibility
        file_path=primary_stored.get("path"),
        file_key=primary_stored.get("file_key"),
        file_url=primary_stored.get("file_url"),
        file_name=primary_stored.get("file_name"),
        file_size=primary_stored.get("size"),
        file_type=primary_stored.get("content_type"),

        # New Non-destructive fields
        original_file_key=stored_original.get("file_key"),
        pdf_file_key=pdf_stored.get("file_key") if pdf_stored else None,
        conversion_status=conversion_status,

        contributor_id=contributor.id,
        status=ContributionStatus.PENDING,
        processing_status=ProcessingStatus.UPLOAD_RECEIVED,
    )
    db.add(contribution)
    await db.flush()  # get ID before commit

    # ── Enqueue background AI review ──────────────────────────────────────────
    # Import here to avoid circular imports
    from app.background.ai_tasks import run_validation_pipeline_task
    background_tasks.add_task(run_validation_pipeline_task, contribution.id)

    return contribution


async def get_contributions_by_user(
    user: User,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedContributions:
    """Return a student's own contribution history."""
    query = select(Contribution).where(Contribution.contributor_id == user.id)

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Contribution.created_at.desc()).offset(offset).limit(page_size)
    )
    items = result.scalars().all()
    storage = get_storage()
    for item in items:
        item.file_url = storage.get_url(item.file_key or item.file_url or item.file_path)

    return PaginatedContributions(
        total=total, page=page, page_size=page_size, items=list(items)
    )


async def get_pending_contributions(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedContributions:
    """Admin: list contributions awaiting review (PENDING or AI_REVIEWED)."""
    query = select(Contribution).where(
        Contribution.status.in_(
            [ContributionStatus.PENDING, ContributionStatus.AI_REVIEWED]
        )
    )
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Contribution.created_at.asc()).offset(offset).limit(page_size)
    )
    items = result.scalars().all()
    storage = get_storage()
    for item in items:
        item.file_url = storage.get_url(item.file_key or item.file_url or item.file_path)

    return PaginatedContributions(
        total=total, page=page, page_size=page_size, items=list(items)
    )


async def review_contribution(
    contribution_id: str,
    decision: ReviewDecision,
    admin: User,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
) -> Contribution:
    """
    Admin approves or rejects a contribution.
    On approval, a new Material record is automatically created.
    """
    result = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id)
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found.")

    if contribution.status == ContributionStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already approved.")
    if contribution.status == ContributionStatus.REJECTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already rejected.")

    contribution.admin_notes = decision.admin_notes
    contribution.status_updated_at = datetime.utcnow()

    if decision.approved:
        contribution.status = ContributionStatus.APPROVED
        contribution.processing_status = ProcessingStatus.APPROVED
        contribution.final_recommendation = FinalRecommendation.APPROVED_FOR_REVIEW
        contribution.student_feedback_message = "Your contribution has been approved by the admin and added to the study materials library."

        # ── Promote to Material ───────────────────────────────────────────────
        material = Material(
            id=generate_uuid(),
            title=contribution.title,
            description=contribution.description,
            subject=contribution.subject,
            course=contribution.course,
            semester=contribution.semester,
            file_path=contribution.file_path,
            file_key=contribution.file_key,
            file_url=contribution.file_url,
            file_name=contribution.file_name,
            file_size=contribution.file_size,
            file_type=contribution.file_type,
            original_file_key=contribution.original_file_key,
            pdf_file_key=contribution.pdf_file_key,
            conversion_status=contribution.conversion_status,
            uploader_id=contribution.contributor_id,
            category=contribution.category,
            is_approved=True,
        )
        db.add(material)
        await db.flush()

        # ── Trigger indexing ────────────────────────────────────────────────
        from app.background.ai_tasks import run_index_update_task
        background_tasks.add_task(run_index_update_task, material.id)
    else:
        contribution.status = ContributionStatus.REJECTED
        contribution.processing_status = ProcessingStatus.REJECTED
        contribution.final_recommendation = FinalRecommendation.REJECTED
        contribution.student_feedback_message = "Your contribution was reviewed by the admin and was not approved for publication."

    await db.flush()
    return contribution


async def reprocess_contribution(
    contribution_id: str,
    user: User,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
) -> Contribution:
    """
    Rerun the AI validation pipeline for a failed contribution.
    """
    result = await db.execute(
        select(Contribution).where(
            Contribution.id == contribution_id,
            Contribution.contributor_id == user.id
        )
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found.")

    if contribution.processing_status != ProcessingStatus.PROCESSING_FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Only failed contributions can be reprocessed. Current status: {contribution.processing_status}"
        )

    # Reset status and trigger pipeline
    contribution.processing_status = ProcessingStatus.UPLOAD_RECEIVED
    contribution.status = ContributionStatus.PENDING
    contribution.processing_started_at = None
    contribution.processing_completed_at = None
    
    # Trigger background task
    from app.background.ai_tasks import run_validation_pipeline_task
    background_tasks.add_task(run_validation_pipeline_task, contribution.id)

    await db.commit()
    await db.refresh(contribution)
    return contribution


async def delete_contribution(
    contribution_id: str,
    user: User,
    db: AsyncSession,
) -> bool:
    """
    Delete a failed contribution record and its associated file.
    """
    result = await db.execute(
        select(Contribution).where(
            Contribution.id == contribution_id,
            Contribution.contributor_id == user.id
        )
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found.")

    # Allow deleting failed or pending contributions
    if contribution.status in [ContributionStatus.APPROVED, ContributionStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot delete a contribution that has already been approved or rejected by an admin."
        )

    # Delete the file from storage
    storage = get_storage()
    try:
        await storage.delete_file(contribution.file_key or contribution.file_path)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to delete file from storage: {e}")
        # Continue with DB deletion even if storage fails

    await db.delete(contribution)
    await db.commit()
    return True
