"""
app/models/user.py — User and Role enum.
"""

import enum
from typing import Optional

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Role(str, enum.Enum):
    STUDENT = "STUDENT"
    ADMIN   = "ADMIN"

    @classmethod
    def _missing_(cls, value) -> Optional["Role"]:
        """Handle case-insensitive Enum lookups (e.g. 'ADMIN' -> Role.ADMIN)."""
        if isinstance(value, str):
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id:              Mapped[str]  = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email:           Mapped[str]  = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name:       Mapped[str]  = mapped_column(String(255), nullable=False)
    display_name:    Mapped[str|None] = mapped_column(String(100), nullable=True)
    avatar_id:       Mapped[str|None] = mapped_column(String(50), nullable=True)
    avatar_type:     Mapped[str|None] = mapped_column(String(20), default="preset", nullable=True)
    avatar_url:      Mapped[str|None] = mapped_column(String(500), nullable=True)
    bio:             Mapped[str|None] = mapped_column(String(300), nullable=True)
    course:          Mapped[str|None] = mapped_column(String(100), nullable=True)
    roll_no:         Mapped[str|None] = mapped_column(String(50), nullable=True)
    last_seen:       Mapped[int|None] = mapped_column(nullable=True)
    hashed_password: Mapped[str]  = mapped_column(String(255), nullable=False)
    role:            Mapped[Role] = mapped_column(Enum(Role, name="userrole"), default=Role.STUDENT, nullable=False)
    department:      Mapped[str|None] = mapped_column(String(100), nullable=True)
    is_active:       Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    materials      = relationship("Material",     back_populates="uploader",    cascade="all, delete-orphan")
    contributions  = relationship("Contribution", back_populates="contributor", cascade="all, delete-orphan")
    chat_sessions  = relationship("ChatSession",  back_populates="user",        cascade="all, delete-orphan")
    favorites      = relationship("Favorite",     back_populates="user",        cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"
