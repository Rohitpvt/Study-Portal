"""
app/models/notification.py
───────────────────────────
Model for user notifications and alerts.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class NotificationType(str, enum.Enum):
    CLASSROOM_ANNOUNCEMENT = "classroom_announcement"
    ASSIGNMENT_CREATED     = "assignment_created"
    ASSIGNMENT_DUE_SOON    = "assignment_due_soon"
    ASSIGNMENT_GRADED      = "assignment_graded"
    ASSIGNMENT_RETURNED    = "assignment_returned"
    PRIVATE_DOUBT_REPLY    = "private_doubt_reply"
    MATERIAL_ADDED         = "material_added"
    SYSTEM_ALERT           = "system_alert"


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id:             Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id:        Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type:           Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notificationtype"), nullable=False)
    title:          Mapped[str] = mapped_column(String(255), nullable=False)
    message:        Mapped[str] = mapped_column(Text, nullable=False)
    link_url:       Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Optional context
    classroom_id:   Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True)
    assignment_id:  Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("classroom_assignments.id", ondelete="SET NULL"), nullable=True)
    
    is_read:        Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Relationships
    user      = relationship("User", backref="notifications")
    classroom = relationship("Classroom")
    assignment = relationship("ClassroomAssignment")

    def __repr__(self) -> str:
        return f"<Notification {self.type} for {self.user_id} (Read: {self.is_read})>"
