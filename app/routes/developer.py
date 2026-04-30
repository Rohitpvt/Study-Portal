"""
app/routes/developer.py
─────────────────────────
Developer-only API endpoints: Profile Control, user role management.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.core.dependencies import DeveloperUser, DBSession
from app.models.user import Role, User
from app.schemas.user import RoleChangeRequest, UserListOut

logger = logging.getLogger("developer_routes")

router = APIRouter(prefix="/developer", tags=["Developer"])


@router.get("/stats", summary="Developer dashboard role statistics")
async def developer_stats(db: DBSession, _: DeveloperUser):
    """Returns aggregated user counts by role."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_students = (await db.execute(
        select(func.count(User.id)).where(User.role == Role.STUDENT)
    )).scalar_one()
    total_teachers = (await db.execute(
        select(func.count(User.id)).where(User.role == Role.TEACHER)
    )).scalar_one()
    total_admins = (await db.execute(
        select(func.count(User.id)).where(User.role == Role.ADMIN)
    )).scalar_one()
    total_developers = (await db.execute(
        select(func.count(User.id)).where(User.role == Role.DEVELOPER)
    )).scalar_one()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_admins": total_admins,
        "total_developers": total_developers,
    }


@router.get("/users", summary="List all users for Profile Control")
async def list_all_users(db: DBSession, _: DeveloperUser):
    """Returns all users with full profile data. Developer-only."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [UserListOut.model_validate(u) for u in users]


@router.patch(
    "/users/{user_id}/role",
    response_model=UserListOut,
    summary="Change a user's role (Developer-only)",
)
async def change_user_role(
    user_id: str,
    payload: RoleChangeRequest,
    db: DBSession,
    current_dev: DeveloperUser,
):
    """
    Change a user's role between STUDENT and ADMIN.
    
    Safety checks:
    - Cannot change a Developer's role (immutable from UI)
    - Cannot assign DEVELOPER role from this endpoint
    - Logs every role change for audit trail
    """
    # 1. Fetch target user
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # 2. Block changes to Developer accounts (immutable)
    if target_user.role == Role.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer accounts are protected. Their role cannot be changed from the UI."
        )

    # 3. Resolve new role
    new_role = Role(payload.new_role)
    old_role = target_user.role

    # 4. No-op check
    if old_role == new_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is already a {new_role.value}."
        )

    # 5. Apply role change
    target_user.role = new_role
    await db.flush()

    # 6. Audit log
    logger.info(
        f"[ROLE_CHANGE] Developer '{current_dev.email}' changed user '{target_user.email}' "
        f"from {old_role.value} to {new_role.value}"
    )

    # Also write to audit table if available
    try:
        from app.services.audit_service import log_action
        await log_action(
            current_dev,
            "ROLE_CHANGE",
            f"Changed role of '{target_user.email}' from {old_role.value} to {new_role.value}",
            db,
        )
    except Exception as e:
        logger.warning(f"[ROLE_CHANGE] Audit log write failed (non-critical): {e}")

    await db.refresh(target_user)
    return target_user


@router.delete(
    "/users/{user_id}",
    summary="Delete a user profile (Developer-only)",
)
async def delete_user(
    user_id: str,
    db: DBSession,
    current_dev: DeveloperUser,
):
    """
    Permanently delete a user from the system.
    Safety checks:
    - Cannot delete a Developer account.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if target_user.role == Role.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer accounts are protected and cannot be deleted via the UI."
        )

    old_email = target_user.email
    await db.delete(target_user)
    await db.flush()

    logger.info(f"[USER_DELETION] Developer '{current_dev.email}' deleted user '{old_email}'")

    try:
        from app.services.audit_service import log_action
        await log_action(
            current_dev,
            "USER_DELETION",
            f"Permanently deleted user '{old_email}'",
            db,
        )
    except Exception as e:
        logger.warning(f"[USER_DELETION] Audit log write failed: {e}")

    return {"detail": "User deleted successfully."}
