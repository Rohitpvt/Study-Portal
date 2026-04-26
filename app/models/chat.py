"""
app/models/chat.py — Chat sessions and message history.
"""

from datetime import datetime
from sqlalchemy import ForeignKey, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    id:      Mapped[str]      = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str]      = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title:   Mapped[str|None] = mapped_column(String(255), nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user     = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage", back_populates="session",
        cascade="all, delete-orphan", order_by="ChatMessage.created_at",
    )

    @property
    def latest_message_preview(self) -> str | None:
        """Returns a short snippet of the latest message, safely avoiding lazy-loads."""
        # Only access if already loaded in session to avoid MissingGreenlet errors
        if "messages" not in self.__dict__:
            return None

        if not self.messages:
            return None
        latest = self.messages[-1] # Chronological order, so last is newest
        return (latest.content[:100] + "...") if len(latest.content) > 100 else latest.content


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id:         Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role:       Mapped[str] = mapped_column(String(20), nullable=False)   # 'user' | 'assistant'
    content:    Mapped[str] = mapped_column(Text, nullable=False)
    mode:       Mapped[str|None] = mapped_column(String(20), nullable=True)
    response_type: Mapped[str|None] = mapped_column(String(20), default="text", nullable=True)
    feedback:   Mapped[str|None] = mapped_column(String(20), nullable=True) # 'helpful' | 'not_helpful'
    sources:    Mapped[str|None] = mapped_column(Text, nullable=True) # JSON serialized string

    session = relationship("ChatSession", back_populates="messages")
