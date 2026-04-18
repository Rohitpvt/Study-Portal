"""
app/models/validation_report.py
───────────────────────────────
Detailed AI validation report for a student contribution.
"""

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ContributionValidationReport(Base, TimestampMixin):
    __tablename__ = "contribution_validation_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    
    # 1:1 relationship with uniqueness enforced
    contribution_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("contributions.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    grammar_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    grammar_details: Mapped[str|None] = mapped_column(Text, nullable=True)
    
    plagiarism_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    plagiarism_details: Mapped[str|None] = mapped_column(Text, nullable=True)
    
    similarity_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    similarity_details: Mapped[str|None] = mapped_column(Text, nullable=True)
    
    toxicity_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    toxicity_details: Mapped[str|None] = mapped_column(Text, nullable=True)
    
    metadata_valid: Mapped[bool|None] = mapped_column(Boolean, nullable=True)
    metadata_details: Mapped[str|None] = mapped_column(Text, nullable=True)
    
    ai_generated_probability: Mapped[float|None] = mapped_column(Float, nullable=True)
    ai_generated_details: Mapped[str|None] = mapped_column(Text, nullable=True)
    
    overall_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    overall_risk_score: Mapped[float|None] = mapped_column(Float, nullable=True)
    
    # Matches FinalRecommendation values (APPROVED_FOR_REVIEW, NEEDS_MANUAL_REVIEW, REJECTED)
    recommendation: Mapped[str|None] = mapped_column(String(50), nullable=True)
    summary: Mapped[str|None] = mapped_column(Text, nullable=True)

    # Relationship back to Contribution
    contribution = relationship("Contribution", back_populates="validation_report")

    def __repr__(self) -> str:
        return f"<ContributionValidationReport contribution_id={self.contribution_id} recommendation={self.recommendation}>"
