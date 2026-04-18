"""
app/routes/users.py
────────────────────
User profile endpoints.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from typing import Dict

from app.core.dependencies import CurrentUser, DBSession
from app.schemas.user import UserOut, UserUpdate
from app.services import user_service
from app.utils.file_handler import get_storage

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut, summary="Get current user profile")
async def get_me(current_user: CurrentUser):
    """Return the authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserOut, summary="Update current user profile")
async def update_me(payload: UserUpdate, current_user: CurrentUser, db: DBSession):
    """Update allowed profile fields (full_name)."""
    return await user_service.update_user_profile(current_user, payload, db)

@router.post("/me/avatar-upload", summary="Upload a custom avatar via S3 / Local")
async def upload_avatar(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...)
):
    """
    Accepts an image and uploads it to users/avatars/{user_id}.
    Saves the returned file_key or URL to the user's avatar_url.
    """
    storage = get_storage()
    
    # Enforce basic format
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Must be JPG, PNG, WEBP, or GIF."
        )

    # 2MB max check natively on upload_file 
    # But just in case, we can rely on file_handler or do a quick peek if needed.
    # The file_handler handles 25MB max by default, we'll enforce 2MB here if we read it manually.
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Avatar exceeds 2MB limit.")
    
    import io
    # Reconstruct UploadFile state
    file.file = io.BytesIO(content)
    
    # upload
    folder_path = f"users/avatars/{current_user.id}"
    result = await storage.upload_file(
        file, 
        folder=folder_path,
        allowed_types={"image/jpeg", "image/png", "image/webp", "image/gif"}
    )
    
    # update user
    current_user.avatar_type = "uploaded"
    # If the storage returned a file_url directly (like s3), or just get the public local path.
    url = storage.get_url(result.get("file_key")) or result.get("file_url")
    current_user.avatar_url = url
    
    await db.commit()
    await db.refresh(current_user)
    
    return {"avatar_url": current_user.avatar_url, "avatar_type": "uploaded"}
