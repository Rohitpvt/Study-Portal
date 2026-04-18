"""
app/models/contribution.py — Student submissions pending AI + admin review.
"""

import enum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid
from app.models.material import Category


class ContributionStatus(str, enum.Enum):
    """Legacy admin-workflow statuses. DO NOT MODIFY — used by admin review flow."""
    PENDING     = "pending"
    AI_REVIEWED = "ai_reviewed"
    APPROVED    = "approved"
    REJECTED    = "rejected"


class ProcessingStatus(str, enum.Enum):
    """
    Granular pipeline processing stages for the Contribution Validation Pipeline.
    Tracks the internal state of multi-step content validation independently
    of the admin-facing ContributionStatus.
    """
    UPLOAD_RECEIVED                 = "upload_received"
    FILE_STORED                     = "file_stored"
    TEXT_EXTRACTION_IN_PROGRESS     = "text_extraction_in_progress"
    GRAMMAR_CHECK_IN_PROGRESS       = "grammar_check_in_progress"
    PLAGIARISM_CHECK_IN_PROGRESS    = "plagiarism_check_in_progress"
    SIMILARITY_CHECK_IN_PROGRESS    = "similarity_check_in_progress"
    TOXICITY_CHECK_IN_PROGRESS      = "toxicity_check_in_progress"
    METADATA_VALIDATION_IN_PROGRESS = "metadata_validation_in_progress"
    AI_DETECTION_IN_PROGRESS        = "ai_detection_in_progress"
    FINAL_SCORING_IN_PROGRESS       = "final_scoring_in_progress"
    PROCESSING_COMPLETE             = "processing_complete"
    SENT_FOR_ADMIN_REVIEW           = "sent_for_admin_review"
    APPROVED                        = "approved"
    REJECTED                        = "rejected"
    PROCESSING_FAILED               = "processing_failed"


class FinalRecommendation(str, enum.Enum):
    """
    Standardized pipeline verdict values.
    Used on both Contribution.final_recommendation and
    ContributionValidationReport.recommendation.
    """
    APPROVED_FOR_REVIEW  = "APPROVED_FOR_REVIEW"
    NEEDS_MANUAL_REVIEW  = "NEEDS_MANUAL_REVIEW"
    REJECTED             = "REJECTED"


class Contribution(Base, TimestampMixin):
    __tablename__ = "contributions"

    id:          Mapped[str]                = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title:       Mapped[str]                = mapped_column(String(255), nullable=False)
    description: Mapped[str|None]           = mapped_column(Text, nullable=True)
    subject:     Mapped[str]                = mapped_column(String(100), nullable=False)
    course:      Mapped[str|None]           = mapped_column(String(100), nullable=True)
    semester:    Mapped[int|None]           = mapped_column(Integer, nullable=True)

    # File metadata
    category:    Mapped[Category]           = mapped_column(
        Enum(Category, name="materialcategory"),
        nullable=False, server_default="notes"
    )
    file_path:   Mapped[str|None] = mapped_column(String(512), nullable=True)
    file_key:    Mapped[str|None] = mapped_column(String(512), nullable=True)
    file_url:    Mapped[str|None] = mapped_column(String(1024), nullable=True)
    file_name:   Mapped[str] = mapped_column(String(255), nullable=False)
    file_size:   Mapped[int] = mapped_column(Integer,     nullable=False)
    file_type:   Mapped[str] = mapped_column(String(50),  nullable=False)

    # Review lifecycle (legacy admin workflow — DO NOT MODIFY)
    status: Mapped[ContributionStatus] = mapped_column(
        Enum(ContributionStatus, name="contributionstatus"),
        default=ContributionStatus.PENDING, nullable=False, index=True
    )

    # AI scores (populated by background task — legacy fields)
    ai_plagiarism_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    ai_grammar_score:    Mapped[float|None] = mapped_column(Float, nullable=True)
    ai_quality_score:    Mapped[float|None] = mapped_column(Float, nullable=True)
    ai_feedback:         Mapped[str|None]   = mapped_column(Text,  nullable=True)

    # Admin decision
    admin_notes: Mapped[str|None] = mapped_column(Text, nullable=True)

    # ── Validation Pipeline Fields (NEW — all nullable for backward compat) ───
    processing_status: Mapped[ProcessingStatus|None] = mapped_column(
        Enum(ProcessingStatus, name="processingstatus"),
        nullable=True, index=True
    )
    uploaded_at:              Mapped[str|None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_started_at:    Mapped[str|None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_completed_at:  Mapped[str|None] = mapped_column(DateTime(timezone=True), nullable=True)
    status_updated_at:        Mapped[str|None] = mapped_column(DateTime(timezone=True), nullable=True)
    final_recommendation: Mapped[FinalRecommendation|None] = mapped_column(
        Enum(FinalRecommendation, name="finalrecommendation"),
        nullable=True
    )
    student_feedback_message: Mapped[str|None] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    contributor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    contributor = relationship("User", back_populates="contributions")
    validation_report = relationship(
        "ContributionValidationReport",
        back_populates="contribution",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Contribution {self.title!r} [{self.status}]>"
