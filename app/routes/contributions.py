"""
app/routes/contributions.py
────────────────────────────
Student contribution endpoints (submit, view own, admin list pending).
"""

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile
from typing import Optional

from app.core.dependencies import AdminUser, CurrentUser, ContributorUser, DBSession
from app.models.contribution import Contribution
from app.models.material import Category
from sqlalchemy import select, func
from fastapi import HTTPException
from app.schemas.contribution import (
    ContributionOut, 
    PaginatedContributions, 
    ContributionStatusTracker, 
    PaginatedContributionStatuses
)
from app.services import contribution_service

router = APIRouter(prefix="/contributions", tags=["Contributions"])


@router.post(
    "",
    response_model=ContributionOut,
    status_code=202,
    summary="Submit a contribution for review",
)
async def submit_contribution(
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: ContributorUser,
    file:        UploadFile      = File(...),
    title:       str             = Form(...),
    course:      str             = Form(...),
    subject:     str             = Form(...),
    category:    Category        = Form(...),
    description: Optional[str]   = Form(None),
    semester:    Optional[int]   = Form(None, ge=1, le=10),
):
    """
    Upload a PDF/DOCX for AI + admin review.
    Returns 202 Accepted — AI review runs asynchronously in the background.
    """
    semester_int = semester

    from app.schemas.contribution import ContributionCreate
    payload = ContributionCreate(
        title=title, 
        description=description if description and description.strip() else None, 
        course=course if course and course.strip() else None,
        subject=subject, 
        semester=semester_int, 
        category=category,
    )
    
    result = await contribution_service.submit_contribution(
        payload, file, current_user, db, background_tasks
    )

    from app.services.audit_service import log_action
    await log_action(current_user, "SUBMIT_CONTRIBUTION", f"Student submitted contribution: {title}", db)
    
    await db.commit()
    await db.refresh(result)

    return result



@router.get(
    "/mine",
    response_model=PaginatedContributions,
    summary="View your own contributions",
)
async def my_contributions(
    db: DBSession,
    current_user: ContributorUser,
    page:      int = Query(1,  ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await contribution_service.get_contributions_by_user(
        current_user, db, page, page_size
    )


@router.get(
    "/pending",
    response_model=PaginatedContributions,
    summary="[Admin] List contributions awaiting review",
)
async def pending_contributions(
    db: DBSession,
    _: AdminUser,  # admin guard
    page:      int = Query(1,  ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await contribution_service.get_pending_contributions(db, page, page_size)


# ── Status Tracking Endpoints ────────────────────────────────────────────────

@router.get(
    "/mine/status",
    response_model=PaginatedContributionStatuses,
    summary="List processing statuses for all your contributions",
)
async def my_contribution_statuses(
    db: DBSession,
    current_user: ContributorUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Returns summarized processing status for polling.
    Excludes full file metadata and scores, focusing strictly on pipeline progress.
    """
    query = select(Contribution).where(Contribution.contributor_id == current_user.id)

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Contribution.created_at.desc()).offset(offset).limit(page_size)
    )
    items = result.scalars().all()

    trackers = [ContributionStatusTracker.from_contribution(item) for item in items]

    return PaginatedContributionStatuses(
        total=total, page=page, page_size=page_size, items=trackers
    )


@router.get(
    "/{contribution_id}/status",
    response_model=ContributionStatusTracker,
    summary="Get processing status for a single contribution",
)
async def get_contribution_status(
    contribution_id: str,
    db: DBSession,
    current_user: ContributorUser,
):
    """
    Returns progress tracking details for a specific upload.
    Designed to be polled frequently by the frontend (e.g. every 3 seconds).
    """
    result = await db.execute(
        select(Contribution).where(
            Contribution.id == contribution_id,
            Contribution.contributor_id == current_user.id
        )
    )
    contribution = result.scalar_one_or_none()

    if not contribution:
        raise HTTPException(
            status_code=404, 
            detail="Contribution not found or you do not have permission to view it."
        )

    return ContributionStatusTracker.from_contribution(contribution)


@router.post(
    "/{contribution_id}/reprocess",
    response_model=ContributionOut,
    summary="Rerun processing for a failed contribution",
)
async def reprocess_failed_contribution(
    contribution_id: str,
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: ContributorUser,
):
    """
    Reruns the AI validation pipeline for a contribution that is stuck in PROCESSING_FAILED.
    """
    return await contribution_service.reprocess_contribution(
        contribution_id, current_user, db, background_tasks
    )


@router.delete(
    "/{contribution_id}",
    status_code=204,
    summary="Delete a failed or pending contribution",
)
async def delete_my_contribution(
    contribution_id: str,
    db: DBSession,
    current_user: ContributorUser,
):
    """
    Permanently removes a contribution record and its associated file.
    Only allowed if the contribution is not yet approved or rejected.
    """
    await contribution_service.delete_contribution(contribution_id, current_user, db)
    return None
@router.get("/{contribution_id}/file", summary="Serve the actual contribution file")
async def serve_contribution_file(
    contribution_id: str, 
    db: DBSession, 
    current_user: CurrentUser,
    download: bool = Query(False, description="Force download if True")
):
    """
    Serves the contribution file directly via a streaming proxy.
    Supports both local and S3 backends.
    """
    result = await db.execute(select(Contribution).where(Contribution.id == contribution_id))
    contribution = result.scalar_one_or_none()
    
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
        
    # Check permission (admin or owner)
    if current_user.role not in ("ADMIN", "DEVELOPER", "TEACHER") and contribution.contributor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    from app.utils.file_handler import get_storage
    storage = get_storage()
    
    # Use PDF key if success, else original
    key = contribution.pdf_file_key if (contribution.conversion_status == "success" and contribution.pdf_file_key) else contribution.file_key
    
    file_info = await storage.get_file_stream(key or contribution.file_url or contribution.file_path)
    content_type = file_info["content_type"]

    headers = {
        "Content-Length": str(file_info["content_length"]),
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "attachment" if download else "inline"
    }

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        file_info["stream"],
        media_type=content_type,
        headers=headers
    )
