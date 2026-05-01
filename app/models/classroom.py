"""
app/models/classroom.py
────────────────────────
Models for the Classroom Module: Classrooms, Topics, Memberships, and Materials.
"""

import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ClassroomStatus(str, enum.Enum):
    ACTIVE   = "active"
    ARCHIVED = "archived"


class MembershipStatus(str, enum.Enum):
    ACTIVE  = "active"
    REMOVED = "removed"


class AssignmentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"


class AIHelpMode(str, enum.Enum):
    ALLOWED = "allowed"
    HINT_ONLY = "hint_only"
    DISABLED = "disabled"


class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    LATE      = "late"
    GRADED    = "graded"
    RETURNED  = "returned"
    MISSING   = "missing"


class SectionType(str, enum.Enum):
    SYLLABUS     = "syllabus"
    NOTES        = "notes"
    PYQ          = "pyq"
    SAMPLE_PAPER = "sample_paper"
    REFERENCE    = "reference"
    OTHER        = "other"


class CommentVisibility(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class CommentStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"


class Classroom(Base, TimestampMixin):
    __tablename__ = "classrooms"

    id:             Mapped[str]      = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name:           Mapped[str]      = mapped_column(String(255), nullable=False)
    description:    Mapped[str|None] = mapped_column(Text, nullable=True)
    subject:        Mapped[str]      = mapped_column(String(100), nullable=False)
    course:         Mapped[str]      = mapped_column(String(100), nullable=False)
    semester:       Mapped[int]      = mapped_column(Integer, nullable=False)
    section:        Mapped[str|None] = mapped_column(String(20), nullable=True)
    join_code:      Mapped[str]      = mapped_column(String(10), unique=True, index=True, nullable=False)
    banner_variant: Mapped[str]      = mapped_column(String(50), default="default")
    status:         Mapped[ClassroomStatus] = mapped_column(Enum(ClassroomStatus, name="classroomstatus"), default=ClassroomStatus.ACTIVE, nullable=False)
    created_by_teacher_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    updated_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator     = relationship("User", backref="created_classrooms")
    memberships = relationship("ClassroomMember", back_populates="classroom", cascade="all, delete-orphan")
    topics      = relationship("ClassroomTopic", back_populates="classroom", cascade="all, delete-orphan", order_by="ClassroomTopic.sort_order")
    materials   = relationship("ClassroomMaterial", back_populates="classroom", cascade="all, delete-orphan")
    announcements = relationship("ClassroomAnnouncement", back_populates="classroom", cascade="all, delete-orphan")
    assignments   = relationship("ClassroomAssignment", back_populates="classroom", cascade="all, delete-orphan")
    comments      = relationship("ClassroomComment", back_populates="classroom", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Classroom {self.name} ({self.join_code})>"


class ClassroomMember(Base, TimestampMixin):
    __tablename__ = "classroom_members"

    id:           Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id:      Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    classroom_id: Mapped[str] = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"))
    role_in_class: Mapped[str] = mapped_column(String(20), nullable=False) # "teacher" or "student"
    status:       Mapped[MembershipStatus] = mapped_column(Enum(MembershipStatus, name="membershipstatus"), default=MembershipStatus.ACTIVE, nullable=False)
    joined_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user      = relationship("User", backref="classroom_participations")
    classroom = relationship("Classroom", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("classroom_id", "user_id", name="uq_classroom_user"),
    )


class ClassroomTopic(Base, TimestampMixin):
    __tablename__ = "classroom_topics"

    id:           Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    classroom_id: Mapped[str] = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"))
    name:         Mapped[str]      = mapped_column(String(100), nullable=False)
    description:  Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sort_order:   Mapped[int]      = mapped_column(Integer, default=0)

    # Relationships
    classroom = relationship("Classroom", back_populates="topics")
    materials = relationship("ClassroomMaterial", back_populates="topic", cascade="all, delete-orphan")


class ClassroomMaterial(Base, TimestampMixin):
    __tablename__ = "classroom_materials"

    id:           Mapped[str]      = mapped_column(String(36), primary_key=True, default=generate_uuid)
    classroom_id: Mapped[str]      = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"))
    topic_id:     Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("classroom_topics.id", ondelete="SET NULL"), nullable=True)
    material_id:  Mapped[str]      = mapped_column(String(36), ForeignKey("materials.id", ondelete="CASCADE"))
    added_by:     Mapped[str]      = mapped_column(String(36), ForeignKey("users.id"))
    section_type: Mapped[SectionType] = mapped_column(Enum(SectionType, name="sectiontype"), default=SectionType.OTHER)

    # Relationships
    classroom = relationship("Classroom", back_populates="materials")
    topic     = relationship("ClassroomTopic", back_populates="materials")
    material  = relationship("Material", backref="classroom_links")
    uploader  = relationship("User", backref="classroom_uploads")


class ClassroomAnnouncement(Base, TimestampMixin):
    __tablename__ = "classroom_announcements"

    id:           Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    classroom_id: Mapped[str] = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"))
    title:        Mapped[str] = mapped_column(String(255), nullable=False)
    content:      Mapped[str] = mapped_column(Text, nullable=False)
    created_by:   Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    pinned:       Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    classroom = relationship("Classroom", back_populates="announcements")
    creator   = relationship("User")


class ClassroomAssignment(Base, TimestampMixin):
    __tablename__ = "classroom_assignments"

    id:           Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    classroom_id: Mapped[str] = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"))
    topic_id:     Mapped[str|None] = mapped_column(String(36), ForeignKey("classroom_topics.id", ondelete="SET NULL"), nullable=True)
    title:        Mapped[str] = mapped_column(String(255), nullable=False)
    description:  Mapped[str|None] = mapped_column(Text, nullable=True)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    points:       Mapped[int] = mapped_column(Integer, default=100)
    due_at:       Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    allow_late_submission: Mapped[bool] = mapped_column(Boolean, default=False)
    late_penalty: Mapped[float|None] = mapped_column(nullable=True)
    status:       Mapped[AssignmentStatus] = mapped_column(Enum(AssignmentStatus, name="assignmentstatus"), default=AssignmentStatus.DRAFT)
    ai_help_mode: Mapped[AIHelpMode] = mapped_column(Enum(AIHelpMode, name="aihelpmode"), default=AIHelpMode.ALLOWED)
    created_by:   Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    # Relationships
    classroom = relationship("Classroom", back_populates="assignments")
    topic     = relationship("ClassroomTopic")
    creator   = relationship("User")
    attachments = relationship("AssignmentAttachment", back_populates="assignment", cascade="all, delete-orphan")
    comments    = relationship("ClassroomComment", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentAttachment(Base):
    __tablename__ = "assignment_attachments"

    id:            Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    assignment_id: Mapped[str] = mapped_column(String(36), ForeignKey("classroom_assignments.id", ondelete="CASCADE"))
    material_id:   Mapped[str|None] = mapped_column(String(36), ForeignKey("materials.id", ondelete="SET NULL"), nullable=True)
    file_key:      Mapped[str|None] = mapped_column(String(512), nullable=True)
    title:         Mapped[str] = mapped_column(String(255), nullable=False)
    attachment_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "material", "link", "upload"
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=func.now())

    assignment = relationship("ClassroomAssignment", back_populates="attachments")
    material   = relationship("Material")


class AssignmentSubmission(Base, TimestampMixin):
    __tablename__ = "assignment_submissions"

    id:                Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    assignment_id:     Mapped[str] = mapped_column(String(36), ForeignKey("classroom_assignments.id", ondelete="CASCADE"))
    student_id:        Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    file_key:          Mapped[str|None] = mapped_column(String(512), nullable=True)
    original_filename: Mapped[str|None] = mapped_column(String(255), nullable=True)
    text_response:     Mapped[str|None] = mapped_column(Text, nullable=True)
    submitted_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    status:            Mapped[SubmissionStatus] = mapped_column(Enum(SubmissionStatus, name="submissionstatus"), default=SubmissionStatus.SUBMITTED)
    marks:             Mapped[float|None] = mapped_column(nullable=True)
    feedback:          Mapped[str|None] = mapped_column(Text, nullable=True)
    graded_by:         Mapped[str|None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    graded_at:         Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    resubmission_allowed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    assignment = relationship("ClassroomAssignment")
    student    = relationship("User", foreign_keys=[student_id])
    grader     = relationship("User", foreign_keys=[graded_by])


class ClassroomComment(Base, TimestampMixin):
    __tablename__ = "classroom_comments"

    id:           Mapped[str]      = mapped_column(String(36), primary_key=True, default=generate_uuid)
    classroom_id: Mapped[str]      = mapped_column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    assignment_id: Mapped[str|None] = mapped_column(String(36), ForeignKey("classroom_assignments.id", ondelete="SET NULL"), nullable=True)
    sender_id:    Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id: Mapped[str|None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    parent_id:    Mapped[str|None] = mapped_column(String(36), ForeignKey("classroom_comments.id", ondelete="CASCADE"), nullable=True)
    content:      Mapped[str]      = mapped_column(Text, nullable=False)
    visibility:   Mapped[CommentVisibility] = mapped_column(Enum(CommentVisibility, name="commentvisibility"), default=CommentVisibility.PUBLIC, nullable=False)
    status:       Mapped[CommentStatus] = mapped_column(Enum(CommentStatus, name="commentstatus"), default=CommentStatus.OPEN, nullable=False)

    # Relationships
    classroom  = relationship("Classroom", back_populates="comments")
    assignment = relationship("ClassroomAssignment", back_populates="comments")
    sender     = relationship("User", foreign_keys=[sender_id], backref="sent_comments")
    recipient  = relationship("User", foreign_keys=[recipient_id], backref="received_comments")
    
    # Self-referential for threaded replies
    replies    = relationship("ClassroomComment", back_populates="parent", cascade="all, delete-orphan")
    parent     = relationship("ClassroomComment", back_populates="replies", remote_side=[id])
