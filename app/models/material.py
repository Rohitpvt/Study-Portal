"""
app/models/material.py — Approved study materials.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Category(str, enum.Enum):
    NOTES           = "NOTES"
    PREVIOUS_PAPERS = "PREVIOUS_PAPERS"
    ASSIGNMENTS     = "ASSIGNMENTS"
    REFERENCE       = "REFERENCE"
    MISC            = "MISC"


class MaterialIntegrityStatus(str, enum.Enum):
    available        = "available"
    missing_file     = "missing_file"
    invalid_metadata = "invalid_metadata"
    pending          = "pending"


class ConversionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED  = "failed"


class Material(Base, TimestampMixin):
    __tablename__ = "materials"

    id:          Mapped[str]      = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title:       Mapped[str]      = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str|None] = mapped_column(Text, nullable=True)
    subject:     Mapped[str]      = mapped_column(String(100), nullable=False, index=True)
    course:      Mapped[str|None] = mapped_column(String(100), nullable=True, index=True)
    semester:    Mapped[int|None] = mapped_column(Integer, nullable=True)
    category:    Mapped[Category] = mapped_column(Enum(Category, name="materialcategory"), nullable=False, index=True)

    # File metadata
    file_path:   Mapped[str|None] = mapped_column(String(512), nullable=True) # Legacy or fallback local path
    file_key:    Mapped[str|None] = mapped_column(String(512), nullable=True) # S3 object key (primary)
    file_url:    Mapped[str|None] = mapped_column(String(1024), nullable=True) # Public/Presigned URL
    file_name:   Mapped[str] = mapped_column(String(255), nullable=False)
    file_size:   Mapped[int] = mapped_column(Integer, nullable=False)
    file_type:   Mapped[str] = mapped_column(String(50), nullable=False)

    # ── Non-destructive dual-key architecture (NEW) ──────────────────────────
    original_file_key: Mapped[str|None] = mapped_column(String(512), nullable=True)
    pdf_file_key:      Mapped[str|None] = mapped_column(String(512), nullable=True)
    conversion_status: Mapped[ConversionStatus|None] = mapped_column(
        Enum(ConversionStatus, name="conversionstatus"),
        default=ConversionStatus.SUCCESS, # Default for PDFs
        nullable=True
    )

    # Integrity tracking
    integrity_status: Mapped[MaterialIntegrityStatus] = mapped_column(
        Enum(MaterialIntegrityStatus, name="materialintegritystatus"), 
        default=MaterialIntegrityStatus.pending, 
        nullable=False,
        index=True
    )
    last_reconciliation_at: Mapped[datetime|None] = mapped_column(nullable=True)

    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    view_count:  Mapped[int]  = mapped_column(Integer, default=0, nullable=False, index=True)
    uploader_id: Mapped[str]  = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    uploader = relationship("User", back_populates="materials")

    # If file_url is not set in DB (legacy records), it can be assigned transiently
    # at the service layer via storage.get_url()
    def __repr__(self) -> str:
        return f"<Material {self.title!r} [{self.category}] - {self.integrity_status}>"
