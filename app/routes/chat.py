"""
app/routes/chat.py
───────────────────
AI chatbot endpoints: ask a question (RAG) and summarize a material.
"""

from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DBSession
from app.schemas.chat import (
    ChatRequest, ChatResponse, SummarizeRequest, SummarizeResponse,
    ChatSessionCreate, ChatSessionOut, ChatHistoryResponse, ChatSessionUpdate
)
from app.services import chatbot_service

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])


@router.post("/ask", response_model=ChatResponse, summary="Ask a question about study material")
async def ask(payload: ChatRequest, current_user: CurrentUser, db: DBSession):
    """
    RAG-powered Q&A.
    - Embeds the query using OpenAI Embeddings
    - Retrieves top matching document chunks from FAISS
    - Returns GPT-4o answer with source material IDs
    - Persists the exchange in chat session history
    """
    return await chatbot_service.ask(
        query=payload.query,
        user_id=current_user.id,
        session_id=payload.session_id,
        db=db,
        course=payload.course,
        subject=payload.subject,
        semester=payload.semester,
    )


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    summary="Summarize a study material",
)
async def summarize(payload: SummarizeRequest, _: CurrentUser, db: DBSession):
    """Return a bullet-point GPT-4o summary of a specific approved material."""
    return await chatbot_service.summarize(payload.material_id, db)


# ── SESSION HISTORY ROUTES ──────────────────────────────────────────────────

@router.get(
    "/sessions",
    response_model=ChatHistoryResponse,
    summary="List current user's chat sessions",
)
async def list_sessions(current_user: CurrentUser, db: DBSession):
    """Retrieve all chat sessions for the authenticated user, sorted by recency."""
    sessions = await chatbot_service.get_sessions(current_user.id, db)
    return {"sessions": sessions}


@router.post(
    "/sessions",
    response_model=ChatSessionOut,
    status_code=201,
    summary="Create a new chat session",
)
async def create_session(
    payload: ChatSessionCreate, 
    current_user: CurrentUser, 
    db: DBSession
):
    """Initialize a new empty chat conversation."""
    return await chatbot_service.create_chat_session(
        user_id=current_user.id, 
        db=db, 
        title=payload.title
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionOut,
    summary="Get session details and message history",
)
async def get_session(
    session_id: str, 
    current_user: CurrentUser, 
    db: DBSession
):
    """Fetch a specific session and all its messages in chronological order."""
    return await chatbot_service.get_session_details(session_id, current_user.id, db)


@router.patch(
    "/sessions/{session_id}",
    response_model=ChatSessionOut,
    summary="Rename a chat session",
)
async def rename_session(
    session_id: str,
    payload: ChatSessionUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update the title of a specific chat session."""
    return await chatbot_service.rename_chat_session(
        session_id=session_id,
        user_id=current_user.id,
        new_title=payload.title,
        db=db,
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=204,
    summary="Delete a chat session",
)
async def delete_session(
    session_id: str, 
    current_user: CurrentUser, 
    db: DBSession
):
    """Permanently remove a chat session and its history."""
    await chatbot_service.delete_chat_session(session_id, current_user.id, db)
    await db.commit()

