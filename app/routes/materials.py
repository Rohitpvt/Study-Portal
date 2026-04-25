"""
app/routes/materials.py
────────────────────────
Study materials library endpoints.
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse

from app.core.dependencies import AdminUser, CurrentUser, DBSession
from app.models.material import Category
from app.schemas.material import MaterialOut, PaginatedMaterials
from app.services import material_service

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get("", response_model=PaginatedMaterials, summary="List all approved materials")
async def list_materials(
    db: DBSession,
    current_user: CurrentUser,  # auth guard
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
        db, current_user=current_user, search=search, title=title, course=course, subject=subject,
        category=category, semester=semester, sort=sort,
        semantic_search=semantic_search,
        page=page, page_size=page_size,
    )


@router.get("/categories", summary="List all material categories (legacy/sync)")
async def get_material_categories():
    """Returns categories for parity with metadata service."""
    from app.data.academic_metadata import CATEGORIES
    return CATEGORIES


@router.get("/{material_id}", response_model=MaterialOut, summary="Get a material by ID")
async def get_material(material_id: str, db: DBSession, current_user: CurrentUser):
    return await material_service.get_material_by_id(material_id, db, current_user=current_user)


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
    current_user: CurrentUser,
    download: bool = Query(False, description="Force download if True")
):
    """
    Serves the material file directly.
    If download=True, sets Content-Disposition to attachment; filename="...".
    If download=False, sets Content-Disposition to inline (without filename to prevent forced downloads).
    Supports both local and S3 backends transparently.
    """
    material = await material_service.get_material_by_id(material_id, db, current_user=current_user)
    
    from app.utils.file_handler import get_storage
    storage = get_storage()
    
    # ── Header Construction ───────────────────────────────────────────────────
    file_info = await storage.get_file_stream(material.file_key or material.file_url or material.file_path)
    content_type = file_info["content_type"]

    # Explicitly force application/pdf if we know it's a PDF (as stored in DB) 
    # to avoid browser confusion
    if material.file_type == "application/pdf" or (material.file_name and material.file_name.lower().endswith(".pdf")):
        content_type = "application/pdf"

    headers = {
        "Content-Length": str(file_info["content_length"]),
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
    }

    if download:
        # Sanitize filename for headers: remove quotes, backslashes and non-ascii characters
        import re
        import unicodedata
        
        # 1. Normalize and strip accents
        safe_name = unicodedata.normalize('NFKD', material.title).encode('ascii', 'ignore').decode('ascii')
        
        # 2. Replace OS-illegal characters
        safe_name = re.sub(r'[\\/*?:"<>|]', "_", safe_name)
        
        # 3. Ensure extension matches type
        ext = ".pdf" if content_type == "application/pdf" else ".docx"
        if not safe_name.lower().endswith(ext):
            safe_name += ext
            
        # 4. Final wrap in quotes for the header
        headers["Content-Disposition"] = f'attachment; filename="{safe_name}"'
        # Prevent caching for forced downloads to ensure clean retries if needed
        headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    else:
        # Standard 'inline' for viewing. 
        # IMPORTANT: No filename parameter here to avoid triggering browser download dialogs.
        headers["Content-Disposition"] = "inline"
        # Safe cache-control for inline viewing: validate with server but allow browser to keep content
        # during the session to reduce flickering, while ensuring no stale content is stuck.
        headers["Cache-Control"] = "private, max-age=0, must-revalidate"

    return StreamingResponse(
        file_info["stream"],
        media_type=content_type,
        headers=headers
    )


@router.get("/{material_id}/download", summary="Get a secure download URL for a material")
async def get_material_download_url(
    material_id: str, 
    db: DBSession, 
    current_user: CurrentUser
):
    """
    Returns a URL that points to the internal /file endpoint with download=1.
    This ensures that the browser triggers a download even for local files.
    """
    material = await material_service.get_material_by_id(material_id, db, current_user=current_user)
    
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


@router.post("/{material_id}/redo-pipeline", summary="Rerun processing pipeline for a material")
async def redo_pipeline(
    material_id: str,
    db: DBSession,
    current_user: AdminUser,
    background_tasks: BackgroundTasks
):
    """
    Admins can manually trigger a reprocessing of a failed or old material.
    Useful for healing broken AI indexes or re-extracting text if extraction failed.
    """
    return await material_service.redo_material_pipeline(material_id, db, background_tasks)
