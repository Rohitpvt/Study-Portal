"""
app/schemas/user.py
────────────────────
Pydantic schemas for user profile endpoints.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

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
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
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
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None


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
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleChangeRequest(BaseModel):
    """Payload for PATCH /developer/users/{user_id}/role."""

    new_role: str

    @field_validator("new_role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"STUDENT", "ADMIN"}
        normalized = v.strip().upper()
        if normalized not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return normalized
