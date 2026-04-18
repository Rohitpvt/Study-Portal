"""
app/routes/contributions.py
────────────────────────────
Student contribution endpoints (submit, view own, admin list pending).
"""

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile
from typing import Optional

from app.core.dependencies import AdminUser, CurrentUser, StudentUser, DBSession
from app.models.contribution import Contribution
from app.models.material import Category
from sqlalchemy import select, func
from fastapi import HTTPException
from app.schemas.contribution import (
    ContributionOut, 
    PaginatedContributions, 
    ContributionStatusTracker, 
    PaginatedContributionStatuses
)
from app.services import contribution_service

router = APIRouter(prefix="/contributions", tags=["Contributions"])


@router.post(
    "",
    response_model=ContributionOut,
    status_code=202,
    summary="Submit a contribution for review",
)
async def submit_contribution(
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: StudentUser,
    file:        UploadFile      = File(...),
    title:       str             = Form(...),
    course:      str             = Form(...),
    subject:     str             = Form(...),
    category:    Category        = Form(...),
    description: Optional[str]   = Form(None),
    semester:    Optional[int]   = Form(None, ge=1, le=10),
):
    """
    Upload a PDF/DOCX for AI + admin review.
    Returns 202 Accepted — AI review runs asynchronously in the background.
    """
    semester_int = semester

    from app.schemas.contribution import ContributionCreate
    payload = ContributionCreate(
        title=title, 
        description=description if description and description.strip() else None, 
        course=course if course and course.strip() else None,
        subject=subject, 
        semester=semester_int, 
        category=category,
    )
    
    result = await contribution_service.submit_contribution(
        payload, file, current_user, db, background_tasks
    )

    from app.services.audit_service import log_action
    await log_action(current_user, "SUBMIT_CONTRIBUTION", f"Student submitted contribution: {title}", db)
    
    await db.commit()
    await db.refresh(result)

    return result



@router.get(
    "/mine",
    response_model=PaginatedContributions,
    summary="View your own contributions",
)
async def my_contributions(
    db: DBSession,
    current_user: StudentUser,
    page:      int = Query(1,  ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await contribution_service.get_contributions_by_user(
        current_user, db, page, page_size
    )


@router.get(
    "/pending",
    response_model=PaginatedContributions,
    summary="[Admin] List contributions awaiting review",
)
async def pending_contributions(
    db: DBSession,
    _: AdminUser,  # admin guard
    page:      int = Query(1,  ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await contribution_service.get_pending_contributions(db, page, page_size)


# ── Status Tracking Endpoints ────────────────────────────────────────────────

@router.get(
    "/mine/status",
    response_model=PaginatedContributionStatuses,
    summary="List processing statuses for all your contributions",
)
async def my_contribution_statuses(
    db: DBSession,
    current_user: StudentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Returns summarized processing status for polling.
    Excludes full file metadata and scores, focusing strictly on pipeline progress.
    """
    query = select(Contribution).where(Contribution.contributor_id == current_user.id)

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Contribution.created_at.desc()).offset(offset).limit(page_size)
    )
    items = result.scalars().all()

    trackers = [ContributionStatusTracker.from_contribution(item) for item in items]

    return PaginatedContributionStatuses(
        total=total, page=page, page_size=page_size, items=trackers
    )


@router.get(
    "/{contribution_id}/status",
    response_model=ContributionStatusTracker,
    summary="Get processing status for a single contribution",
)
async def get_contribution_status(
    contribution_id: str,
    db: DBSession,
    current_user: StudentUser,
):
    """
    Returns progress tracking details for a specific upload.
    Designed to be polled frequently by the frontend (e.g. every 3 seconds).
    """
    result = await db.execute(
        select(Contribution).where(
            Contribution.id == contribution_id,
            Contribution.contributor_id == current_user.id
        )
    )
    contribution = result.scalar_one_or_none()

    if not contribution:
        raise HTTPException(
            status_code=404, 
            detail="Contribution not found or you do not have permission to view it."
        )

    return ContributionStatusTracker.from_contribution(contribution)
