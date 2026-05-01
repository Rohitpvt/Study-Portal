"""
app/services/notification_service.py
─────────────────────────────────────
Service for managing user notifications.
"""

import logging
from typing import List, Optional
from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationCreate

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def create_notification(db: AsyncSession, data: NotificationCreate) -> Optional[Notification]:
        """Creates a single notification."""
        try:
            notification = Notification(**data.model_dump())
            db.add(notification)
            await db.commit()
            await db.refresh(notification)
            return notification
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            await db.rollback()
            return None

    @staticmethod
    async def create_bulk_notifications(db: AsyncSession, notifications: List[NotificationCreate]):
        """Creates multiple notifications efficiently."""
        try:
            objs = [Notification(**n.model_dump()) for n in notifications]
            db.add_all(objs)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to create bulk notifications: {e}")
            await db.rollback()

    @staticmethod
    async def list_my_notifications(db: AsyncSession, user_id: str, limit: int = 50, offset: int = 0) -> List[Notification]:
        """Lists notifications for a specific user."""
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: str) -> int:
        """Gets the count of unread notifications for a user."""
        result = await db.execute(
            select(func.count(Notification.id))
            .where(and_(Notification.user_id == user_id, Notification.is_read == False))
        )
        return result.scalar() or 0

    @staticmethod
    async def mark_read(db: AsyncSession, notification_id: str, user_id: str) -> bool:
        """Marks a specific notification as read."""
        result = await db.execute(
            update(Notification)
            .where(and_(Notification.id == notification_id, Notification.user_id == user_id))
            .values(is_read=True)
        )
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: str):
        """Marks all notifications for a user as read."""
        await db.execute(
            update(Notification)
            .where(and_(Notification.user_id == user_id, Notification.is_read == False))
            .values(is_read=True)
        )
        await db.commit()
