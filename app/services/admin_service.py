"""
app/services/admin_service.py
──────────────────────────────
Admin dashboard statistics and user management logic.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contribution import Contribution, ContributionStatus
from app.models.material import Material
from app.models.user import Role, User


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """
    Aggregate platform statistics for the admin dashboard.
    Returns counts of users, materials, and contributions by status.
    """
    # Total students
    students_count = (
        await db.execute(select(func.count(User.id)).where(User.role == Role.STUDENT))
    ).scalar_one()

    # Total approved materials
    materials_count = (
        await db.execute(select(func.count(Material.id)).where(Material.is_approved == True))  # noqa
    ).scalar_one()

    # Contributions by status
    contribution_stats: dict[str, int] = {}
    for status in ContributionStatus:
        count = (
            await db.execute(
                select(func.count(Contribution.id)).where(Contribution.status == status)
            )
        ).scalar_one()
        contribution_stats[status.value] = count

    # Recent registrations (last 5 users)
    recent_users_result = await db.execute(
        select(User.id, User.full_name, User.email, User.created_at)
        .order_by(User.created_at.desc())
        .limit(5)
    )
    recent_users = [
        {"id": r.id, "full_name": r.full_name, "email": r.email, "created_at": str(r.created_at)}
        for r in recent_users_result.all()
    ]

    return {
        "total_students":  students_count,
        "total_materials": materials_count,
        "contributions":   contribution_stats,
        "recent_users":    recent_users,
    }


async def toggle_user_active(user_id: str, db: AsyncSession) -> User:
    """Admin: activate or deactivate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_active = not user.is_active
    await db.flush()
    return user


async def get_alert_summary(db: AsyncSession) -> dict:
    """
    Lightweight aggregation of actionable alerts for admin/developer navbar.
    Returns counts for: broken files, failed pipelines, pending contacts, negative feedback.
    """
    from app.models.material import Material, MaterialIntegrityStatus
    from app.models.contribution import Contribution, ProcessingStatus
    from app.models.support import ContactSubmission
    from app.models.chat import ChatMessage

    # Broken files (not available)
    broken_files = (
        await db.execute(
            select(func.count(Material.id)).where(
                Material.integrity_status != MaterialIntegrityStatus.available,
                Material.is_approved == True,  # noqa
            )
        )
    ).scalar_one()

    # Failed pipelines
    failed_pipelines = (
        await db.execute(
            select(func.count(Contribution.id)).where(
                Contribution.processing_status == ProcessingStatus.PROCESSING_FAILED
            )
        )
    ).scalar_one()

    # Pending contributions waiting for admin review
    pending_reviews = (
        await db.execute(
            select(func.count(Contribution.id)).where(
                Contribution.status == ContributionStatus.AI_REVIEWED
            )
        )
    ).scalar_one()

    # Unread contact submissions (count all — no read/unread flag yet)
    contact_queries = (
        await db.execute(select(func.count(ContactSubmission.id)))
    ).scalar_one()

    # Negative feedback on AI responses
    negative_feedback = (
        await db.execute(
            select(func.count(ChatMessage.id)).where(
                ChatMessage.feedback == "not_helpful"
            )
        )
    ).scalar_one()

    total = broken_files + failed_pipelines + pending_reviews
    
    return {
        "total": total,
        "broken_files": broken_files,
        "failed_pipelines": failed_pipelines,
        "pending_reviews": pending_reviews,
        "contact_queries": contact_queries,
        "negative_feedback": negative_feedback,
    }

