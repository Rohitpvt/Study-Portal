"""
app/services/user_service.py
──────────────────────────────
User profile management.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserUpdate
from app.constants.avatars import VALID_AVATARS


async def get_user_by_id(user_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


async def update_user_profile(user: User, payload: UserUpdate, db: AsyncSession) -> User:
    """Update allowed profile fields (full_name, display_name, avatar_id)."""
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.display_name is not None:
        user.display_name = payload.display_name
        
    if payload.bio is not None:
        safe_bio = payload.bio.strip()[:250]
        user.bio = safe_bio
        
    if payload.avatar_type is not None:
        if payload.avatar_type not in ["preset", "animated", "uploaded"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid avatar type.")
        user.avatar_type = payload.avatar_type
        
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
        
    if payload.avatar_id is not None:
        if user.avatar_type != "uploaded" and payload.avatar_id not in VALID_AVATARS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid preset/animated avatar ID selection.")
        user.avatar_id = payload.avatar_id

    await db.flush()
    return user
