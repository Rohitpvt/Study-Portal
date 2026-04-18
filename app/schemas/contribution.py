"""
app/schemas/contribution.py
────────────────────────────
Pydantic schemas for the contribution workflow.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.contribution import ContributionStatus
from app.models.material import Category
from app.models.material import Category


class ContributionCreate(BaseModel):
    """Form fields submitted with a contribution file upload."""

    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    subject: str = Field(..., min_length=2, max_length=100)
    course: Optional[str] = Field(None, max_length=100)
    semester: Optional[int] = Field(None, ge=1, le=10)
    category: Category = Field(..., description="Classification of the document")


class ContributionOut(BaseModel):
    """Full contribution representation."""

    id: str
    title: str
    description: Optional[str]
    subject: str
    course: Optional[str]
    semester: Optional[int]
    file_name: str
    file_size: int
    file_type: str
    category: Category
    status: ContributionStatus
    ai_plagiarism_score: Optional[float]
    ai_grammar_score: Optional[float]
    ai_quality_score: Optional[float]
    ai_feedback: Optional[str]
    admin_notes: Optional[str]
    contributor_id: str
    file_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Validation Pipeline fields
    processing_status: Optional[str] = None
    final_recommendation: Optional[str] = None
    student_feedback_message: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewDecision(BaseModel):
    """Admin payload for POST /admin/contributions/{id}/review."""

    approved: bool
    admin_notes: Optional[str] = Field(None, max_length=1000)


class PaginatedContributions(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ContributionOut]


# ── Validation Pipeline Schemas ──────────────────────────────────────────────

class ProcessingStatusOut(BaseModel):
    """Student-visible processing status for a contribution."""
    contribution_id: str
    processing_status: Optional[str]
    uploaded_at: Optional[datetime]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    status_updated_at: Optional[datetime]
    final_recommendation: Optional[str]
    student_feedback_message: Optional[str]

    model_config = {"from_attributes": True}


class ValidationLayerResult(BaseModel):
    """Result from a single validation layer."""
    score: Optional[float]
    details: Optional[dict]


class ValidationReportOut(BaseModel):
    """Full structured validation report."""
    id: str
    contribution_id: str
    grammar: ValidationLayerResult
    plagiarism: ValidationLayerResult
    similarity: ValidationLayerResult
    toxicity: ValidationLayerResult
    metadata_validation: ValidationLayerResult
    ai_generated_content: ValidationLayerResult
    overall_score: Optional[float]
    recommendation: Optional[str]
    summary: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinalRecommendationOut(BaseModel):
    """Lightweight recommendation response."""
    contribution_id: str
    recommendation: Optional[str]
    overall_score: Optional[float]
    summary: Optional[str]

    model_config = {"from_attributes": True}


# ── Student-Facing Status Tracker Schemas ────────────────────────────────────

# Ordered pipeline steps used to compute progress_percentage and completed_steps.
# Terminal / error states are excluded from this ordered list.
_ORDERED_PIPELINE_STEPS: list[str] = [
    "upload_received",
    "file_stored",
    "text_extraction_in_progress",
    "grammar_check_in_progress",
    "plagiarism_check_in_progress",
    "toxicity_check_in_progress",
    "metadata_validation_in_progress",
    "final_scoring_in_progress",
    "processing_complete",
    "sent_for_admin_review",
]


class ContributionStatusTracker(BaseModel):
    """Student-facing contribution status with progress metrics.

    Designed for polling — includes enough detail so the frontend can
    render a progress stepper and a human-readable status message.
    """
    contribution_id: str
    title: str
    uploaded_at: Optional[datetime] = None
    processing_status: Optional[str] = None
    status_updated_at: Optional[datetime] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    final_recommendation: Optional[str] = None
    student_feedback_message: Optional[str] = None
    completed_steps: list[str] = []
    current_step: Optional[str] = None
    progress_percentage: int = 0

    model_config = {"from_attributes": True}

    @staticmethod
    def from_contribution(contrib) -> "ContributionStatusTracker":
        """Build a tracker from a Contribution ORM instance, computing
        completed_steps, current_step, and progress_percentage from the
        processing_status enum value."""
        status_val = (
            contrib.processing_status.value
            if contrib.processing_status else None
        )
        recommendation_val = (
            contrib.final_recommendation.value
            if contrib.final_recommendation else None
        )

        # Compute progress metrics
        completed: list[str] = []
        current: Optional[str] = None
        pct = 0

        if status_val is not None:
            if status_val == "processing_failed":
                # Show how far we got before failure
                current = "processing_failed"
                pct = 0  # indeterminate
            elif status_val in _ORDERED_PIPELINE_STEPS:
                idx = _ORDERED_PIPELINE_STEPS.index(status_val)
                completed = _ORDERED_PIPELINE_STEPS[:idx]
                current = status_val
                # +1 because the current step is in progress
                pct = int(((idx + 1) / len(_ORDERED_PIPELINE_STEPS)) * 100)
            else:
                # Unknown / new status — show as-is
                current = status_val

        return ContributionStatusTracker(
            contribution_id=contrib.id,
            title=contrib.title,
            uploaded_at=contrib.uploaded_at,
            processing_status=status_val,
            status_updated_at=contrib.status_updated_at,
            processing_started_at=contrib.processing_started_at,
            processing_completed_at=contrib.processing_completed_at,
            final_recommendation=recommendation_val,
            student_feedback_message=contrib.student_feedback_message,
            completed_steps=completed,
            current_step=current,
            progress_percentage=pct,
        )


class PaginatedContributionStatuses(BaseModel):
    """Paginated list of contribution status trackers."""
    total: int
    page: int
    page_size: int
    items: List[ContributionStatusTracker]
