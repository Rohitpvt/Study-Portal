from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.notification import NotificationType

class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    title: str
    message: str
    link_url: Optional[str] = None
    classroom_id: Optional[str] = None
    assignment_id: Optional[str] = None

class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    link_url: Optional[str] = None
    classroom_id: Optional[str] = None
    assignment_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    is_read: bool

class NotificationSummary(BaseModel):
    unread_count: int
    latest_notifications: List[NotificationOut]
