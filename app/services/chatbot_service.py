"""
app/services/chatbot_service.py
────────────────────────────────
Modular RAG-based AI chatbot service.
Relies on decoupled `app/ai/rag.py` for embeddings and FAISS interactions.
"""

import logging
from typing import Optional
import re
import string
import json
from datetime import datetime

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatMessage, ChatSession
from app.models.material import Material
from app.models.base import generate_uuid
from app.schemas.chat import ChatResponse, SummarizeResponse
from app.utils.text_extractor import extract_text 
from app.ai import rag 
from fastapi import HTTPException, status
from sqlalchemy import func

logger = logging.getLogger(__name__)


async def get_library_inventory_summary(
    db: AsyncSession,
    course: Optional[str] = None,
    subject: Optional[str] = None,
    semester: Optional[int] = None,
) -> str:
    """
    Fetch a real-time summary of approved materials from the database
    to provide the chatbot with 'Library Inventory' awareness.
    """
    query = select(Material).where(Material.is_approved == True)
    
    if course:
        query = query.where(Material.course == course)
    if subject:
        query = query.where(Material.subject == subject)
    if semester:
        query = query.where(Material.semester == semester)
        
    result = await db.execute(query)
    materials = result.scalars().all()
    
    if not materials:
        filters = []
        if course: filters.append(f"Course: {course}")
        if subject: filters.append(f"Subject: {subject}")
        if semester: filters.append(f"Semester: {semester}")
        filter_str = f" for {', '.join(filters)}" if filters else ""
        return f"The library currently has no approved materials{filter_str}."

    total_count = len(materials)
    
    # Group by subject
    subjects = {}
    categories = {}
    titles = []
    
    for m in materials:
        subjects[m.subject] = subjects.get(m.subject, 0) + 1
        categories[m.category.value] = categories.get(m.category.value, 0) + 1
        titles.append(f"- {m.title} ({m.subject}, {m.category.value})")

    subj_summary = ", ".join([f"{k} ({v})" for k, v in subjects.items()])
    cat_summary = ", ".join([f"{k} ({v})" for k, v in categories.items()])
    
    # Limit titles to prevent prompt bloat
    display_titles = "\n".join(titles[:40])
    if len(titles) > 40:
        display_titles += f"\n... and {len(titles) - 40} more."

    return (
        f"LIBRARY INVENTORY SUMMARY\n"
        f"Total Approved Materials: {total_count}\n"
        f"Distribution by Subject: {subj_summary}\n"
        f"Distribution by Category: {cat_summary}\n\n"
        f"Available Titles:\n{display_titles}"
    )


async def build_index(db: AsyncSession) -> None:
    """
    Triggers the FAISS index load or rebuild.
    Prioritizes loading existing index from disk to save on API costs and startup time.
    """
    # 1. Try loading from disk first
    if rag.load_index():
        logger.info("RAG index loaded successfully from persistent storage.")
        return

    # 2. Rebuild if no index found
    logger.info("No RAG index found on disk. Initializing full rebuild from approved materials...")
    result = await db.execute(
        select(Material).where(Material.is_approved == True)  # noqa: E712
    )
    materials = result.scalars().all()

    if not materials:
        logger.info("No approved materials found in DB — skipping FAISS rebuild.")
        return
        
    await rag.build(materials)


from app.services import llm_service, memory_service

async def ask(
    query: str,
    user_id: str,
    session_id: Optional[str],
    db: AsyncSession,
    course: Optional[str] = None,
    subject: Optional[str] = None,
    semester: Optional[int] = None,
) -> ChatResponse:
    """
    Stateful study chatbot logic with conversation history, multi-turn memory, 
    and metadata-aware academic filtering.
    """
    # ── 0. Thresholds & Safety Settings ───────────────────────────────────────
    SIMILARITY_THRESHOLD = 1.1
    MIN_CONTEXT_LENGTH   = 150
    MIN_VALID_HITS       = 2

    # ── 1. Query Normalization & Validation ──────────────────────────────────
    # Trim, lowercase, and normalize internal whitespace
    query = (query or "").strip()
    q_normalized = query.lower()
    q_normalized = re.sub(r"\s+", " ", q_normalized)
    
    # Catch truly empty inputs early
    if not q_normalized:
        return ChatResponse(
            session_id=session_id or generate_uuid(),
            answer="It seems like you didn't ask a question. Please type your query so I can assist you!",
            mode="general",
            sources=[]
        )

    # ── 1.5 Junk / Spam Guard ──────────────────────────────────────────────────
    def is_query_junk(q: str) -> bool:
        """Detect clear spam, gibberish, or punctuation-only queries."""
        q_clean = q.replace(" ", "")
        if not q_clean: return True
        if all(char in string.punctuation or char.isdigit() for char in q_clean):
            return True
        if len(q_clean) > 6 and len(set(q_clean)) <= 3:
            return True
            
        words = q.split()
        for word in words:
            w_lower = word.lower()
            # Consonant heavy or extremely long nonsense
            if len(w_lower) >= 5 and not any(v in w_lower for v in "aeiouy"):
                return True
            if len(w_lower) > 20:
                return True
        return False

    if is_query_junk(q_normalized):
        return ChatResponse(
            session_id=session_id or generate_uuid(),
            answer="I didn't quite catch that. Could you please provide a clearer academic query?",
            mode="general",
            sources=[]
        )

    # Fast-Path Greeting & Identity Detection (Direct Match Bypass)
    identity_tokens = [
        "hi", "hello", "hey", "ping", "who are you", "who you are", 
        "what are you", "what can you do", "what you do", "thanks", "thank you"
    ]
    if q_normalized in identity_tokens:
        return ChatResponse(
            session_id=session_id or generate_uuid(), 
            answer="Hello! I am the Christ University AI Library Assistant. I can help you find study materials or answer questions by searching the academic notes in our library.",
            mode="general",
            sources=[]
        )

    # ── 2. Session Management ──────────────────────────────────────────────────
    session: Optional[ChatSession] = None
    if session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        
        # Auto-title generation: Rename if it's a freshly created conversation
    if session is None:
        # Detect if query is meaningful enough for a title
        greeting_tokens = {"hi", "hello", "hey", "test", "ping", "help", "thanks", "thank you", "ok", "okay"}
        is_meaningful = q_normalized not in greeting_tokens and len(q_normalized.split()) >= 2
            
        initial_title = "New Chat"
        if is_meaningful:
            # Smart truncation: cap at 40, trim to nearest whole word
            raw_title = query[:45].strip()
            if len(raw_title) > 40:
                initial_title = raw_title[:40].rsplit(' ', 1)[0]
            else:
                initial_title = raw_title

        session = ChatSession(
            id=session_id or generate_uuid(),
            user_id=user_id,
            title=initial_title,
        )
        db.add(session)
        await db.flush()
    else:
        # Auto-title generation for sessions that weren't titled yet
        if session.title == "New Chat":
            greeting_tokens = {"hi", "hello", "hey", "test", "ping", "help", "thanks", "thank you", "ok", "okay"}
            if q_normalized not in greeting_tokens and len(q_normalized.split()) >= 2:
                raw_title = query[:45].strip()
                if len(raw_title) > 40:
                    session.title = raw_title[:40].rsplit(' ', 1)[0]
                else:
                    session.title = raw_title

    # ── 3. Memory Retrieval ───────────────────────────────────────────────────
    history = memory_service.get_memory(session.id)

    # ── 4. Query Handling ─────────────────────────────────────────────────────
    q_lower = q_normalized
    skip_faiss = False
    
    logger.info(f"[CHAT] normalized_query='{q_lower}'")
    
    with open("debug_chat.log", "a") as f:
        f.write(f"DEBUG: Processing query: '{query}'\n")
        f.write(f"DEBUG: q_lower: '{q_lower}'\n")

    # Intent Routing: Detect library inventory queries
    library_patterns = [
        r"(how many|list|what|which).*(notes|materials|topics|subjects|papers|assignments|content|study material|resources|book|documents)",
        r"(show|tell me).*(available|present|in (the )?library|you have)",
        r"what (notes|content|materials|subjects) (do you have|are there)",
        r"what's in the library",
        r"topics covered",
        r"inventory summary",
        r"do you have.*notes",
        r"titles available",
        r"what subjects are available",
        r"list materials in the library"
    ]
    
    is_library_query = False
    for i, pattern in enumerate(library_patterns):
        if re.search(pattern, q_lower):
            logger.info(f"Intent Routing: Matched library pattern {i} for query '{query}'")
            is_library_query = True
            break

    # Intent Routing: Detect general conversational/world knowledge queries to bypass FAISS
    general_patterns = [
        r"\b(how.*are.*you)\b",
        r"\b(what.*you.*do)\b",
        r"\b(what.*can.*you.*do)\b",
        r"\b(who.*are.*you)\b",
        r"\b(who.*you.*are)\b",
        r"\b(what.*are.*you)\b",
        r"\b(thank.*you|thanks|thx)\b",
        r"^ok(ay)?$",
        r"^(hi|hello|hey|greetings)$",
        r"^(good morning|good evening|good afternoon)",
        r"\b(what.*is.*your.*name)\b",
        r"tell me about yourself",
        # World Knowledge Overrides (Strict Patterns)
        r"\b(who.*is.*(elon musk|bill gates|steve jobs|mark zuckerberg|narendra modi))\b",
        # Broad World Knowledge / General topics
        r"\b(what.*is.*(kiwi|apple|banana|mango|fruit|animal|dog|cat|weather))\b",
        r"\b(tell.*me.*a.*(joke|story|poem))\b",
        r"\b(how.*to.*(cook|bake|make))\b"
    ]
    
    is_general_query = False
    # Relaxed length check: only auto-generalize tiny non-academic tokens
    if len(q_lower.split()) <= 1 and q_lower not in ["ml", "dbms", "sql", "rag", "os"]:
        if q_lower in ["thanks", "ok", "okay", "cool", "nice", "great"]:
            is_general_query = True
    
    for pattern in general_patterns:
        if re.search(pattern, q_lower):
            is_general_query = True
            break
    
    if is_library_query:
        skip_faiss = True
        mode = "library"
        route_label = "library"
    elif is_general_query:
        skip_faiss = True
        mode = "general"
        route_label = "general"
    else:
        route_label = "faiss_rag"

    logger.info(f"[CHAT] route={route_label} | query='{q_lower}'")
    logger.info(f"Chatbot Flow: query='{query}', is_library={is_library_query}, skip_faiss={skip_faiss}")

    # ── 5. RAG Retrieval & Context Formatting ──────────────────────────────────
    raw_context = ""
    source_labels = []
    min_distance = 9.9
    
    # Initialize mode based on intent
    if is_library_query:
        mode = "library"
    elif skip_faiss:
        mode = "general"
    else:
        mode = "document"

    if not skip_faiss:
        raw_context, source_labels, min_distance = await rag.retrieve(
            query, 
            top_k=5,
            course=course,
            subject=subject,
            semester=semester
        )
        
        # ── 5.1 Multi-Signal Relevance Gating ──────────────────────────────────
        num_hits = len(source_labels)
        context_len = len(raw_context)
        soft_threshold = min(SIMILARITY_THRESHOLD + 0.15, 1.35)
        
        # Detect summary/explanation intent
        summary_keywords = ["summarize", "summary", "explain", "describe", "detail", "definition", "what is", "about"]
        is_summary_query = any(word in q_lower for word in summary_keywords)
        
        relevance_pass = False
        reason = "all_signals_weak"
        
        # A. Strong similarity (Strict Path)
        if min_distance < SIMILARITY_THRESHOLD:
            relevance_pass = True
            reason = "strong_distance"
        
        # B. Multi-hit confidence (Signal Path)
        elif num_hits >= MIN_VALID_HITS and context_len > MIN_CONTEXT_LENGTH and min_distance < soft_threshold:
            relevance_pass = True
            reason = "multi_hit_override"
            
        # C. Context strength (Depth Path)
        elif context_len > 1000 and min_distance < soft_threshold:
            relevance_pass = True
            reason = "context_strength_override"
            
        # D. Summary intent boost (Contextual Path)
        elif is_summary_query and min_distance < soft_threshold and context_len > MIN_CONTEXT_LENGTH:
            relevance_pass = True
            reason = "summary_intent_boost"

        # E. False-Positive Defense (Subject Mismatch Guard)
        if relevance_pass and source_labels:
            top_titles = set(src.get('title', '').lower() for src in source_labels)
            
            # List of typical subjects to guard against cross-contamination
            academic_subjects = [
                "machine learning", "ml", "operating system", "os", "compiler design", 
                "dbms", "database", "quantum mechanics", "artificial intelligence", 
                "algorithms", "physics", "biology", "chemistry", "mathematics"
            ]
            
            query_focus = None
            for subj in academic_subjects:
                if re.search(r"\b" + re.escape(subj) + r"s?\b", q_lower):
                    query_focus = subj
                    break
                    
            if query_focus:
                found_match = False
                for title in top_titles:
                    if query_focus in title:
                        found_match = True
                        break
                
                if not found_match:
                    relevance_pass = False
                    reason = "subject_mismatch_guard"

        logger.info(f"[RAG] Decision: {'document_mode' if relevance_pass else 'general_mode'} | reason={reason} | dist={min_distance:.4f} | hits={num_hits} | ctx={context_len} | sum_intent={is_summary_query}")

        if not relevance_pass:
            logger.info(f"RAG discarded due to low relevance confidence. Query: '{query}'")
            raw_context = ""
            source_labels = []
            if mode == "document":
                mode = "general"
    
    # ── 5.2 Library Inventory Fetch ──────────────────────────────────────────
    inventory_context = ""
    if is_library_query:
        inventory_context = await get_library_inventory_summary(
            db, course=course, subject=subject, semester=semester
        )
    
    # ── 5.5 HARD MODE SEPARATION: Ensure state is clean before prompt construction ──
    if mode == "general":
        raw_context = ""
        source_labels = []
    elif mode == "library":
        # Library mode should also not show document sources
        source_labels = []

    # ── 6. Prompt Construction ─────────────────────────────────────────────────
    if mode == "library" and inventory_context:
        formatted_query = f"""
### REAL-TIME LIBRARY INVENTORY:
{inventory_context}

### STUDENT QUESTION:
{query}
"""
        system_content = (
            "You are a professional academic AI assistant. "
            "The student is asking about the materials currently available in the platform library. "
            "Use the provided LIBRARY INVENTORY list to answer precisely. "
            "If they ask for counts, give the exact number from the summary. "
            "If they ask for specific topics or subjects, list the matching materials from the inventory. "
            "Do not talk about external books or general internet resources. Only mention what is in the inventory."
        )
    elif mode == "document" and raw_context:
        formatted_query = f"""
### CONTEXT FROM STUDY MATERIALS:
{raw_context}

### STUDENT QUESTION:
{query}
"""
        system_content = (
            "You are a professional academic AI assistant. "
            "Use the provided context to answer the student's question accurately. "
            "Include citations using the source labels (File, Page). "
            "If the answer is partially in the context and partially from your knowledge, "
            "prioritize the context but be helpful."
        )
    else:
        # Strict General Mode / Fallback Loop (HARD MODE SEPARATION)
        formatted_query = query
        mode = "general"
        source_labels = []
        raw_context = "" # Strictly clear context
        system_content = (
            "You are a professional AI assistant. Answer the user's query naturally "
            "from your internal knowledge. Do NOT mention any uploaded materials, "
            "library inventory, or 'provided context', as none was provided. "
            "Provide a helpful and direct answer based on general knowledge. "
            "Do not cite any sources."
        )

    # ── 6.5 Code Intent Detection ───────────────────────────────────────────────
    # Identify if the user wants code generation, debugging, or programming examples
    q_lower = query.lower()
    code_patterns = [
        r"\b(write|generate|build|create|implement|make|provide|show|give).*(code|script|function|class|method|snippet|example|logic|query|program|component)\b",
        r"\b(python|react|java|c\+\+|javascript|typescript|flutter|sql|html|css|go|rust|c#|golang|php|swift|kotlin)\b.*(code|script|query|component|example|logic|implementation|function)",
        r"\b(fix|debug|refactor|optimize|explain|trace).*(code|script|error|logic|bug)\b",
        r"\bconvert.*to\b.*\b(python|java|javascript|c\+\+|react|typescript|html|css)\b",
        r"\b(how to (write|code|program|implement|build))\b"
    ]
    
    is_code_intent = False
    for pattern in code_patterns:
        if re.search(pattern, q_lower):
            is_code_intent = True
            break

    if is_code_intent:
        system_content += (
            "\n\n### CODE GENERATION RULES:\n"
            "You are in CODE MODE. Focus on technical accuracy and efficient implementation.\n"
            "Always use clean, well-documented markdown code blocks.\n"
            "If the user asks to implement something based on the context, synthesize the logic carefully.\n"
            "Prioritize code quality and follow language-specific best practices."
        )

    messages = [
        {"role": "system", "content": system_content}
    ]
    
    messages.extend(history)
    messages.append({"role": "user", "content": formatted_query})

    response_type = "code" if is_code_intent else "text"
    logger.info(f"[CHAT] Intent routing determined response_type={response_type}")

    # ── 7. LLM Invocation ──────────────────────────────────────────────────────
    if is_code_intent:
        answer = await llm_service.get_code_response(messages)
    else:
        answer = await llm_service.get_chat_response(messages)

    # ── 7.5 Quality Control: Detect Context Mismatch Post-Generation ───────────
    # If the LLM explicitly states the context was missing/irrelevant, hide sources.
    ignore_context_markers = [
        "does not mention", 
        "no information provided", 
        "context does not contain",
        "provided context talks about",
        "context appears to be related to"
    ]
    if any(marker in answer.lower() for marker in ignore_context_markers):
        if mode == "document":
            logger.info(f"[CHAT] LLM indicated context mismatch. Clearing sources for query: '{query}'")
            source_labels = []
            # Optionally downgrade mode to general for DB consistency
            mode = "general"

    # ── 8. Persistence (Memory & Database) ────────────────────────────────────
    memory_service.add_message(session.id, "user", query)
    memory_service.add_message(session.id, "assistant", answer)
    memory_service.trim_memory(session.id, max_messages=10)

    # Update session activity
    session.last_message_at = datetime.now()

    db.add(ChatMessage(
        id=generate_uuid(), 
        session_id=session.id, 
        role="user",      
        content=query,
        mode=mode,
        response_type=response_type
    ))
    db.add(ChatMessage(
        id=generate_uuid(), 
        session_id=session.id, 
        role="assistant", 
        content=answer,
        mode=mode,
        response_type=response_type,
        sources=json.dumps(source_labels) if source_labels else None
    ))
    await db.flush()

    # ── 9. Final Safety Cleanup (Source of Truth Enforcement) ─────────────────
    if mode != "document":
        source_labels = []
    
    return ChatResponse(
        session_id=session.id, 
        answer=answer, 
        mode=mode, 
        response_type=response_type,
        sources=source_labels
    )


async def summarize(material_id: str, db: AsyncSession) -> SummarizeResponse:
    """Summarize a study material."""
    result = await db.execute(
        select(Material).where(
            Material.id == material_id,
            Material.is_approved == True,  # noqa: E712
        )
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")

    source_target = material.file_url if material.file_url else material.file_path
    pages = await extract_text(source_target)
    if not pages:
        return SummarizeResponse(
            material_id=material_id,
            title=material.title,
            summary="Could not extract text from this material.",
        )

    # Combine text from all pages for summary (up to token limit)
    full_text = "\n".join([p["text"] for p in pages])
    content_sample = full_text[:4000].strip()
    
    prompt = f"""
Summarize the following academic material in a concise, bulleted Markdown format.
Focus on the core learning objectives and key technical concepts.

TITLE: {material.title}
CONTENT:
{content_sample}
"""

    summary = await llm_service.get_ai_response(prompt)
    
    return SummarizeResponse(material_id=material_id, title=material.title, summary=summary)


# ── SESSION MANAGEMENT ────────────────────────────────────────────────────────

async def get_sessions(user_id: str, db: AsyncSession) -> list[ChatSession]:
    """List all chat sessions for a user, ordered by most recent activity."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .options(selectinload(ChatSession.messages))
        .order_by(ChatSession.last_message_at.desc())
    )
    return result.scalars().all()


async def get_session_details(session_id: str, user_id: str, db: AsyncSession) -> ChatSession:
    """Get a specific session with its full message history."""
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id
        )
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat history not found."
        )
        
    # Restore the recent bounded slice to memory to resume conversation seamlessly
    recent_messages = session.messages[-10:] if len(session.messages) > 10 else session.messages
    memory_history = [{"role": msg.role, "content": msg.content} for msg in recent_messages]
    
    from app.services import memory_service
    memory_service.set_memory(session_id, memory_history)
    
    return session


async def create_chat_session(user_id: str, db: AsyncSession, title: Optional[str] = "New Chat") -> ChatSession:
    """Create a new empty chat session with relationship initialized."""
    session = ChatSession(
        id=generate_uuid(),
        user_id=user_id,
        title=title
    )
    db.add(session)
    await db.flush()
    
    # Manually initialize relationship to avoid lazy-loading error during serialization
    session.messages = []
    
    return session


async def rename_chat_session(session_id: str, user_id: str, new_title: str, db: AsyncSession) -> ChatSession:
    """Rename an existing chat session with validation."""
    clean_title = new_title.strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session title cannot be empty."
        )
    
    session = await get_session_details(session_id, user_id, db)
    session.title = clean_title[:255] # Ensure length safety
    await db.flush()
    return session


async def delete_chat_session(session_id: str, user_id: str, db: AsyncSession) -> None:
    """Delete a chat session and its associated messages."""
    session = await get_session_details(session_id, user_id, db)
    await db.delete(session)
    await db.flush()


async def submit_feedback(message_id: str, user_id: str, feedback: str, db: AsyncSession) -> ChatMessage:
    """
    Record user feedback ('helpful' / 'not_helpful') on an assistant message.
    Only allows feedback on assistant messages within the user's own sessions.
    """
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(
            ChatMessage.id == message_id,
            ChatMessage.role == "assistant",
            ChatSession.user_id == user_id,
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or not an assistant message."
        )
    
    message.feedback = feedback
    await db.flush()
    logger.info(f"[FEEDBACK] user={user_id} message={message_id} feedback={feedback}")
    return message

