"""
app/routes/notifications.py
────────────────────────────
API endpoints for user notifications.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import DBSession, CurrentUser
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationOut, NotificationSummary

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationOut])
async def get_my_notifications(
    db: DBSession,
    current_user: CurrentUser,
    limit: int = 50,
    offset: int = 0
):
    """Fetch notifications for the current user."""
    return await NotificationService.list_my_notifications(db, current_user.id, limit, offset)

@router.get("/summary", response_model=NotificationSummary)
async def get_notification_summary(
    db: DBSession,
    current_user: CurrentUser
):
    """Fetch unread count and latest notifications."""
    unread_count = await NotificationService.get_unread_count(db, current_user.id)
    latest = await NotificationService.list_my_notifications(db, current_user.id, limit=10)
    return {
        "unread_count": unread_count,
        "latest_notifications": latest
    }

@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: str,
    db: DBSession,
    current_user: CurrentUser
):
    """Mark a notification as read."""
    success = await NotificationService.mark_read(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or not owned by user.")
    return {"message": "Notification marked as read"}

@router.patch("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    db: DBSession,
    current_user: CurrentUser
):
    """Mark all notifications as read."""
    await NotificationService.mark_all_read(db, current_user.id)
    return {"message": "All notifications marked as read"}
