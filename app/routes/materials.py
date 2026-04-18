"""
app/routes/materials.py
────────────────────────
Study materials library endpoints.
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile

from app.core.dependencies import AdminUser, CurrentUser, DBSession
from app.models.material import Category
from app.schemas.material import MaterialOut, PaginatedMaterials
from app.services import material_service

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get("", response_model=PaginatedMaterials, summary="List all approved materials")
async def list_materials(
    db: DBSession,
    _: CurrentUser,  # auth guard — just requires login
    search:   Optional[str]      = Query(None, description="Search in title/description"),
    title:    Optional[str]      = Query(None, description="Filter exact title"),
    course:   Optional[str]      = Query(None),
    subject:  Optional[str]      = Query(None),
    category: Optional[Category] = Query(None),
    semester: Optional[int]      = Query(None, ge=1, le=10),
    sort:     str                = Query("latest", description="latest, oldest, or views"),
    semantic_search: bool        = Query(False, description="Use AI embeddings instead of exact keyword match"),
    page:     int                = Query(1,  ge=1),
    page_size: int               = Query(20, ge=1, le=100),
):
    """Paginated, filterable list of approved study materials."""
    return await material_service.get_materials(
        db, search=search, title=title, course=course, subject=subject,
        category=category, semester=semester, sort=sort,
        semantic_search=semantic_search,
        page=page, page_size=page_size,
    )


@router.get("/{material_id}", response_model=MaterialOut, summary="Get a material by ID")
async def get_material(material_id: str, db: DBSession, _: CurrentUser):
    return await material_service.get_material_by_id(material_id, db)


@router.post("", response_model=MaterialOut, status_code=201, summary="Upload a new material")
async def upload_material(
    db: DBSession,
    current_user: AdminUser,
    background_tasks: BackgroundTasks,
    file:        UploadFile = File(...),
    title:       str        = Form(...),
    course:      str        = Form(...),
    subject:     str        = Form(...),
    category:    Category   = Form(...),
    description: Optional[str] = Form(None),
    semester:    Optional[int] = Form(None, ge=1, le=10),
):
    """
    Upload a study material (PDF / DOCX).
    Admin uploads skip contribution review and are auto-indexed.
    """
    from app.schemas.material import MaterialCreate
    payload = MaterialCreate(
        title=title, description=description, course=course,
        subject=subject, semester=semester, category=category,
    )
    result = await material_service.upload_material(payload, file, current_user, db)

    from app.services.audit_service import log_action
    await log_action(current_user, "UPLOAD_MATERIAL", f"Admin uploaded material: {title}", db)
    
    await db.commit()
    await db.refresh(result)

    # Trigger incremental FAISS indexing (non-blocking)
    from app.background.ai_tasks import run_index_update_task
    background_tasks.add_task(run_index_update_task, result.id)

    return result


@router.delete("/{material_id}", status_code=204, summary="Remove a material (admin)")
async def delete_material(
    material_id: str, 
    db: DBSession, 
    current_user: AdminUser,
    background_tasks: BackgroundTasks
):
    """Soft-delete a material (sets is_approved=False) and propagates to AI index."""
    await material_service.delete_material(material_id, db, background_tasks=background_tasks)
    await db.commit()


@router.get("/{material_id}/download", summary="Get a secure download URL for a material")
async def get_material_download_url(
    material_id: str, 
    db: DBSession, 
    _: CurrentUser
):
    """
    Returns a secure, attachment-configured presigned URL for the material.
    Forces browser download instead of inline viewing.
    """
    material = await material_service.get_material_by_id(material_id, db)
    
    from app.utils.file_handler import get_storage
    storage = get_storage()
    
    # Generate URL with is_download=True
    # Use material title + extension for a cleaner download filename
    ext = ".pdf" if material.file_type == "application/pdf" else ".docx"
    filename = f"{material.title}{ext}"
    
    download_url = storage.get_url(
        material.file_key or material.file_url or material.file_path,
        is_download=True,
        filename=filename
    )
    
    return {"download_url": download_url}
