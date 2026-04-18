"""
app/schemas/user.py
────────────────────
Pydantic schemas for user profile endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.user import Role


class UserOut(BaseModel):
    """Public user representation — never expose hashed_password."""

    id: str
    email: EmailStr
    full_name: str
    display_name: Optional[str] = None
    avatar_id: Optional[str] = None
    avatar_type: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    course: Optional[str] = None
    roll_no: Optional[str] = None
    last_seen: Optional[int] = None
    role: Role
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Patch payload for PATCH /users/me."""

    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_id: Optional[str] = None
    avatar_type: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class UserListOut(BaseModel):
    """Paginated user list item (admin use)."""

    id: str
    email: EmailStr
    full_name: str
    display_name: Optional[str] = None
    avatar_id: Optional[str] = None
    avatar_type: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    course: Optional[str] = None
    roll_no: Optional[str] = None
    last_seen: Optional[int] = None
    role: Role
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
