"""
app/routes/materials.py
────────────────────────
Study materials library endpoints.
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile
from fastapi.responses import FileResponse, RedirectResponse

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


@router.get("/{material_id}/file", summary="Serve the actual material file")
async def serve_material_file(
    material_id: str, 
    db: DBSession, 
    _: CurrentUser,
    download: bool = Query(False, description="Force download if True")
):
    """
    Serves the material file directly.
    If download=True, sets Content-Disposition to attachment.
    Supports both local and S3 backends transparently.
    """
    material = await material_service.get_material_by_id(material_id, db)
    
    from app.utils.file_handler import get_storage
    storage = get_storage()
    
    # Identify extension and generate friendly filename
    ext = ".pdf" if material.file_type == "application/pdf" else ".docx"
    filename = f"{material.title}{ext}"
    
    # If using Local storage, return FileResponse directly (avoids StaticFiles limitations)
    from app.core.config import settings
    if settings.STORAGE_BACKEND == "local":
        clean_key = (material.file_key or material.file_path or material.file_url).replace("/api/v1/uploads/", "").lstrip("/")
        full_path = os.path.join(settings.UPLOAD_DIR, clean_key).replace('\\', '/')
        
        if not os.path.exists(full_path):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="File not found on disk.")
            
        return FileResponse(
            path=full_path,
            filename=filename if download else None,
            content_disposition_type="attachment" if download else "inline"
        )
    
    # If using S3, generate a presigned URL and redirect
    download_url = storage.get_url(
        material.file_key or material.file_url or material.file_path,
        is_download=download,
        filename=filename if download else None
    )
    return RedirectResponse(url=download_url)


@router.get("/{material_id}/download", summary="Get a secure download URL for a material")
async def get_material_download_url(
    material_id: str, 
    db: DBSession, 
    _: CurrentUser
):
    """
    Returns a URL that points to the internal /file endpoint with download=1.
    This ensures that the browser triggers a download even for local files.
    """
    material = await material_service.get_material_by_id(material_id, db)
    
    from app.core.config import settings
    if settings.STORAGE_BACKEND == "s3":
        # For S3, we can still use the direct presigned URL as it supports headers
        from app.utils.file_handler import get_storage
        storage = get_storage()
        ext = ".pdf" if material.file_type == "application/pdf" else ".docx"
        filename = f"{material.title}{ext}"
        url = storage.get_url(
            material.file_key or material.file_url or material.file_path,
            is_download=True,
            filename=filename
        )
    else:
        # For Local, we point to our proxy route which forces attachment
        url = f"/api/v1/materials/{material_id}/file?download=1"
    
    return {"download_url": url}
