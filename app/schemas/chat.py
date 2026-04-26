"""
app/schemas/chat.py
────────────────────
Pydantic schemas for the AI chatbot endpoints.
"""

from datetime import datetime
from typing import List, Optional, Any

import json
from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    """Payload for POST /chat/ask."""

    query: str = Field(..., min_length=2, max_length=2000)
    session_id: Optional[str] = None  # None → create new session
    
    # Optional Filters
    course: Optional[str] = None
    subject: Optional[str] = None
    semester: Optional[int] = None


class SourceMeta(BaseModel):
    title: str
    source_file: str
    page_number: Optional[int] = None
    material_id: str
    excerpt: Optional[str] = None
    course: Optional[str] = None
    subject: Optional[str] = None
    semester: Optional[int] = None

class ChatResponse(BaseModel):
    """AI answer response."""

    session_id: str
    message_id: str
    answer: str
    mode: str = "document"  # "general" | "document" | "library"
    response_type: str = "text"  # "text" | "code"
    sources: List[SourceMeta] = []  # Detailed document citations


class SummarizeRequest(BaseModel):
    """Payload for POST /chat/summarize."""

    material_id: str


class SummarizeResponse(BaseModel):
    """Summarization response."""

    material_id: str
    title: str
    summary: str


class ChatMessageOut(BaseModel):
    """Single message in chat history."""

    id: str
    role: str  # 'user' | 'assistant'
    content: str
    mode: Optional[str] = None
    response_type: Optional[str] = "text"  # "text" | "code"
    sources: Optional[List[SourceMeta]] = []
    feedback: Optional[str] = None  # 'helpful' | 'not_helpful' | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("sources", mode="before")
    @classmethod
    def parse_sources(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v or []


class ChatFeedbackRequest(BaseModel):
    """Payload for POST /chat/messages/{message_id}/feedback."""
    feedback: str = Field(..., pattern="^(helpful|not_helpful)$")


class ChatSessionCreate(BaseModel):
    """Payload to create a new session."""
    title: Optional[str] = "New Chat"


class ChatSessionUpdate(BaseModel):
    """Payload to update an existing session (rename)."""
    title: str = Field(..., min_length=1, max_length=255)


class ChatSessionOut(BaseModel):
    """Chat session with message history."""

    id: str
    title: Optional[str]
    created_at: datetime
    last_message_at: datetime
    latest_message_preview: Optional[str] = None
    messages: List[ChatMessageOut] = []

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    """List of chat sessions for history view."""
    sessions: List[ChatSessionOut]
