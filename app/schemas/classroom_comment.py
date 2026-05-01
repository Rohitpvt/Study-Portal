from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.classroom import CommentVisibility, CommentStatus

class ClassroomCommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    visibility: CommentVisibility = CommentVisibility.PUBLIC
    assignment_id: Optional[str] = None
    recipient_id: Optional[str] = None
    parent_id: Optional[str] = None

class ClassroomCommentCreate(ClassroomCommentBase):
    pass

class ClassroomCommentUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    status: Optional[CommentStatus] = None

class ClassroomCommentOut(BaseModel):
    id: str
    classroom_id: str
    assignment_id: Optional[str] = None
    sender_id: str
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    recipient_id: Optional[str] = None
    content: str
    visibility: CommentVisibility
    status: CommentStatus
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ClassroomCommentThread(ClassroomCommentOut):
    replies: List["ClassroomCommentThread"] = []

# Necessary for recursive model
ClassroomCommentThread.update_forward_refs()
