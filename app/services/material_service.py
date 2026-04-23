"""
app/services/material_service.py
──────────────────────────────────
Business logic for fetching, uploading, and searching study materials.
"""

from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Category, Material
from app.models.base import generate_uuid
from app.models.user import User, Role
from app.schemas.material import MaterialCreate, PaginatedMaterials
from app.utils.file_handler import get_storage


async def upload_material(
    payload: MaterialCreate,
    file: UploadFile,
    uploader: User,
    db: AsyncSession,
) -> Material:
    """
    Validate, store the file, and create a Material record.
    Admin uploads are auto-approved; student uploads also auto-approve (
    direct uploads are trusted — student contributions go through
    the contribution workflow instead).
    """
    storage = get_storage()
    
    # ── Validation ────────────────────────────────────────────────────────────
    # Reject forbidden patterns in filename/key to prevent malformed cloud records
    forbidden = [":\\", ":/", "\\\\", "C:", "D:"]
    if any(p in file.filename for p in forbidden):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_FILENAME: Local file paths or device names are not permitted."
        )

    try:
        stored = await storage.upload_file(file, folder=payload.category.value)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Storage failed: {e}. Falling back to LocalStorage.")
        from app.utils.file_handler import LocalStorage
        from app.core.config import settings
        storage = LocalStorage(base_dir=settings.UPLOAD_DIR)
        stored = await storage.upload_file(file, folder=payload.category.value)

    from app.models.material import MaterialIntegrityStatus
    from datetime import datetime

    material = Material(
        id=generate_uuid(),
        title=payload.title,
        description=payload.description,
        subject=payload.subject,
        course=payload.course,
        semester=payload.semester,
        category=payload.category,
        file_path=stored.get("path"), # fallback
        file_key=stored.get("file_key"),
        file_url=stored.get("file_url"),
        file_name=stored.get("file_name"),
        file_size=stored.get("size"),
        file_type=stored.get("content_type"),
        uploader_id=uploader.id,
        is_approved=True,
        integrity_status=MaterialIntegrityStatus.available, # New uploads are assumed available
        last_reconciliation_at=datetime.utcnow()
    )
    db.add(material)
    await db.flush()
    return material


async def get_materials(
    db: AsyncSession,
    current_user: User, # Required for role-based integrity filtering
    search: Optional[str] = None,
    title: Optional[str] = None,
    course: Optional[str] = None,
    subject: Optional[str] = None,
    category: Optional[Category] = None,
    semester: Optional[int] = None,
    sort: str = "latest",
    semantic_search: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedMaterials:
    """
    Return a paginated, filtered list of approved materials.
    Students see ONLY available materials. Admins see everything.
    """
    from app.models.material import MaterialIntegrityStatus
    
    query = select(Material).where(Material.is_approved == True)  # noqa: E712

    # If student, strictly only show 'available'
    if current_user.role != Role.ADMIN:
        query = query.where(Material.integrity_status == MaterialIntegrityStatus.available)

    # ── Filters ───────────────────────────────────────────────────────────────
    if search:
        if semantic_search:
            from app.ai import rag
            _, sources = await rag.retrieve(search, top_k=20)
            if sources:
                # Extract material IDs from structured source metadata
                source_ids = list(set([src.get("material_id") for src in sources if src.get("material_id")]))
                if source_ids:
                    query = query.where(Material.id.in_(source_ids))
                else:
                    return PaginatedMaterials(total=0, page=page, page_size=page_size, items=[])
            else:
                return PaginatedMaterials(total=0, page=page, page_size=page_size, items=[])
        else:
            term = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(Material.title).like(term),
                    func.lower(Material.description).like(term),
                )
            )
    
    if title:
        query = query.where(func.lower(Material.title).like(f"%{title.strip().lower()}%"))
    if course:
        query = query.where(func.lower(func.trim(Material.course)) == course.strip().lower())
    if subject:
        query = query.where(func.lower(func.trim(Material.subject)) == subject.strip().lower())
    if category:
        query = query.where(Material.category == category)
    if semester:
        query = query.where(Material.semester == semester)

    # ── Count total (for pagination meta) ─────────────────────────────────────
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    # ── Sort mapping ──────────────────────────────────────────────────────────
    if sort == "oldest":
        query = query.order_by(Material.created_at.asc())
    elif sort == "views":
        query = query.order_by(Material.view_count.desc(), Material.created_at.desc())
    else:  # "latest" or fallback
        query = query.order_by(Material.created_at.desc())

    # ── Apply pagination ──────────────────────────────────────────────────────
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    # ── Populate URLs & Cached File Status ────────────────────────────────────
    for item in items:
        # Override file_url to point to our internal streaming proxy (/materials/{id}/file)
        # This ensures the browser fetches content from our domain, bypassing S3 CORS blocks.
        item.file_url = f"/api/v1/materials/{item.id}/file"
        
        # Rely purely on the DB's reconciled integrity status, avoiding slow S3 checks
        item.file_status = item.integrity_status.value

    return PaginatedMaterials(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


async def get_material_by_id(material_id: str, db: AsyncSession, current_user: User) -> Material:
    """
    Fetch a single approved material or raise 404.
    If student, also strictly filter by available integrity status.
    """
    from app.models.material import MaterialIntegrityStatus
    
    query = select(Material).where(
        Material.id == material_id,
        Material.is_approved == True,  # noqa: E712
    )
    
    # If student, strictly only show 'available'
    if current_user.role != Role.ADMIN:
        query = query.where(Material.integrity_status == MaterialIntegrityStatus.available)

    result = await db.execute(query)
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found or currently unavailable.",
        )
    
    # 3. Use the cached integrity status from the database
    # (Background reconciliation keeps this accurate without blocking user requests)
    material.file_status = material.integrity_status.value
    
    return material


async def update_material_integrity(
    material_id: str,
    status: MaterialIntegrityStatus,
    message: Optional[str],
    db: AsyncSession
) -> None:
    """Updates the integrity status and message for a material (used by background worker)."""
    from datetime import datetime
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if material:
        material.integrity_status = status
        material.integrity_message = message
        material.last_reconciliation_at = datetime.utcnow()
        await db.flush()


from fastapi import BackgroundTasks

async def delete_material(material_id: str, db: AsyncSession, background_tasks: Optional[BackgroundTasks] = None) -> None:
    """Soft-delete by marking is_approved=False (admin only) and removing from AI index."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Use select directly to find any material regardless of review status
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")

    logger.info(f"[DELETE] Admin request to remove material: {material.id} - '{material.title}'")

    # 1. Capture info and Hard delete from physical storage
    file_key = material.file_key or material.file_path or material.file_url
    storage = get_storage()
    delete_ok = await storage.delete_file(file_key)
    
    if delete_ok:
        logger.info(f"[DELETE] Storage cleanup SUCCESS for: {file_key}")
    else:
        logger.warning(f"[DELETE] Storage cleanup FAILED (file may not exist): {file_key}")

    # 2. Soft-delete in database
    material.is_approved = False
    await db.flush()
    logger.info(f"[DELETE] DB soft-delete SUCCESS for: {material.id}")

    # 3. Trigger FAISS index removal
    if background_tasks:
        from app.background.ai_tasks import run_index_remove_task
        background_tasks.add_task(run_index_remove_task, material_id)
    else:
        from app.ai import rag
        if rag.remove_material(material_id):
            logger.info(f"[DELETE] FAISS index removal SUCCESS for: {material_id}")
        else:
            logger.warning(f"[DELETE] FAISS index removal FAILED/Skipped for: {material_id}")
