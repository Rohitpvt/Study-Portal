"""
app/routes/developer.py
─────────────────────────
Developer-only API endpoints: Profile Control, user role management.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func, delete, update

from app.core.dependencies import DeveloperUser, DBSession
from app.models.user import Role, User
from app.models.classroom import (
    Classroom, ClassroomMember, ClassroomTopic, ClassroomMaterial,
    ClassroomAnnouncement, ClassroomAssignment, AssignmentAttachment,
    AssignmentSubmission, ClassroomComment
)
from app.models.notification import Notification
from app.models.favorite import Favorite
from app.models.audit import AuditLog
from app.models.chat import ChatSession, ChatMessage
from app.models.contribution import Contribution
from app.models.material import Material
from app.schemas.user import RoleChangeRequest, UserListOut, BatchUserDeleteRequest

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


async def _cleanup_user_related_records(db: DBSession, user_id: str) -> None:
    """Cascade cleanup across all tables linked to a user before deletion."""
    await db.execute(delete(ClassroomComment).where((ClassroomComment.sender_id == user_id) | (ClassroomComment.recipient_id == user_id)))
    await db.execute(delete(AssignmentSubmission).where(AssignmentSubmission.student_id == user_id))
    await db.execute(update(AssignmentSubmission).where(AssignmentSubmission.graded_by == user_id).values(graded_by=None))
    await db.execute(delete(ClassroomMember).where(ClassroomMember.user_id == user_id))

    user_assign_ids = (await db.execute(select(ClassroomAssignment.id).where(ClassroomAssignment.created_by == user_id))).scalars().all()
    if user_assign_ids:
        await db.execute(delete(AssignmentAttachment).where(AssignmentAttachment.assignment_id.in_(user_assign_ids)))
        await db.execute(delete(AssignmentSubmission).where(AssignmentSubmission.assignment_id.in_(user_assign_ids)))
        await db.execute(delete(ClassroomComment).where(ClassroomComment.assignment_id.in_(user_assign_ids)))
        await db.execute(delete(ClassroomAssignment).where(ClassroomAssignment.id.in_(user_assign_ids)))

    await db.execute(delete(ClassroomAnnouncement).where(ClassroomAnnouncement.created_by == user_id))
    await db.execute(delete(ClassroomMaterial).where(ClassroomMaterial.added_by == user_id))
    await db.execute(delete(ClassroomTopic).where(ClassroomTopic.created_by == user_id))

    created_class_ids = (await db.execute(select(Classroom.id).where(Classroom.created_by_teacher_id == user_id))).scalars().all()
    if created_class_ids:
        c_assign_ids = (await db.execute(select(ClassroomAssignment.id).where(ClassroomAssignment.classroom_id.in_(created_class_ids)))).scalars().all()
        if c_assign_ids:
            await db.execute(delete(AssignmentAttachment).where(AssignmentAttachment.assignment_id.in_(c_assign_ids)))
            await db.execute(delete(AssignmentSubmission).where(AssignmentSubmission.assignment_id.in_(c_assign_ids)))
            await db.execute(delete(ClassroomComment).where(ClassroomComment.assignment_id.in_(c_assign_ids)))
            await db.execute(delete(ClassroomAssignment).where(ClassroomAssignment.id.in_(c_assign_ids)))

        await db.execute(delete(ClassroomMember).where(ClassroomMember.classroom_id.in_(created_class_ids)))
        await db.execute(delete(ClassroomComment).where(ClassroomComment.classroom_id.in_(created_class_ids)))
        await db.execute(delete(ClassroomAnnouncement).where(ClassroomAnnouncement.classroom_id.in_(created_class_ids)))
        await db.execute(delete(ClassroomMaterial).where(ClassroomMaterial.classroom_id.in_(created_class_ids)))
        await db.execute(delete(ClassroomTopic).where(ClassroomTopic.classroom_id.in_(created_class_ids)))
        await db.execute(delete(Classroom).where(Classroom.id.in_(created_class_ids)))

    await db.execute(delete(Notification).where(Notification.user_id == user_id))
    await db.execute(delete(Favorite).where(Favorite.user_id == user_id))
    await db.execute(delete(AuditLog).where(AuditLog.user_id == user_id))

    user_chat_ids = (await db.execute(select(ChatSession.id).where(ChatSession.user_id == user_id))).scalars().all()
    if user_chat_ids:
        await db.execute(delete(ChatMessage).where(ChatMessage.session_id.in_(user_chat_ids)))
        await db.execute(delete(ChatSession).where(ChatSession.id.in_(user_chat_ids)))

    user_mat_ids = (await db.execute(select(Material.id).where(Material.uploader_id == user_id))).scalars().all()
    if user_mat_ids:
        await db.execute(delete(ClassroomMaterial).where(ClassroomMaterial.material_id.in_(user_mat_ids)))
        await db.execute(delete(AssignmentAttachment).where(AssignmentAttachment.material_id.in_(user_mat_ids)))
        await db.execute(delete(Favorite).where(Favorite.material_id.in_(user_mat_ids)))
        await db.execute(delete(Material).where(Material.uploader_id == user_id))

    await db.execute(delete(Contribution).where(Contribution.contributor_id == user_id))


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
    - Cascades cleanup across Classroom, Submissions, Materials, Chat, Audit, Notifications.
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

    try:
        await _cleanup_user_related_records(db, user_id)
        await db.delete(target_user)
        await db.commit()

        logger.info(f"[USER_DELETION] Developer '{current_dev.email}' deleted user '{old_email}'")

        try:
            from app.services.audit_service import log_action
            await log_action(
                current_dev,
                "USER_DELETION",
                f"Permanently deleted user '{old_email}'",
                db,
            )
            await db.commit()
        except Exception as e:
            logger.warning(f"[USER_DELETION] Audit log write failed: {e}")

        return {"detail": "User deleted successfully."}
    except Exception as e:
        await db.rollback()
        logger.error(f"[USER_DELETION] Failed to delete user '{old_email}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user profile: {str(e)}"
        )


@router.post(
    "/users/batch-delete",
    summary="Batch delete users (Developer-only)",
)
async def batch_delete_users(
    payload: BatchUserDeleteRequest,
    db: DBSession,
    current_dev: DeveloperUser,
):
    """Permanently delete multiple users in a single operation."""
    if not payload.user_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user IDs provided.")

    deleted_ids = []
    deleted_emails = []

    try:
        for uid in payload.user_ids:
            if uid == current_dev.id:
                continue

            result = await db.execute(select(User).where(User.id == uid))
            target_user = result.scalar_one_or_none()
            if not target_user or target_user.role == Role.DEVELOPER:
                continue

            await _cleanup_user_related_records(db, uid)
            deleted_emails.append(target_user.email)
            await db.delete(target_user)
            deleted_ids.append(uid)

        await db.commit()

        logger.info(f"[BATCH_USER_DELETION] Developer '{current_dev.email}' deleted {len(deleted_ids)} users: {deleted_emails}")

        try:
            from app.services.audit_service import log_action
            await log_action(
                current_dev,
                "BATCH_USER_DELETION",
                f"Batch deleted {len(deleted_ids)} user(s): {', '.join(deleted_emails)}",
                db,
            )
            await db.commit()
        except Exception as e:
            logger.warning(f"[BATCH_USER_DELETION] Audit log write failed: {e}")

        return {
            "detail": f"Successfully deleted {len(deleted_ids)} user(s).",
            "deleted_count": len(deleted_ids),
            "deleted_ids": deleted_ids
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"[BATCH_USER_DELETION] Batch deletion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch user deletion failed: {str(e)}"
        )

