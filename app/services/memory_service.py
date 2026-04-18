"""
app/services/memory_service.py
───────────────────────────────
Lightweight, thread-safe in-memory chat history manager.
Stores session-based conversation context for multi-turn AI interactions.
"""

import threading
from typing import List, Dict

# In-memory storage: session_id -> list of message dicts
# Format: {"role": "user" | "assistant", "content": str}
_chat_memory: Dict[str, List[Dict[str, str]]] = {}
_memory_lock = threading.Lock()

def get_memory(session_id: str) -> List[Dict[str, str]]:
    """
    Retrieve the message history for a given session.
    If session doesn't exist, returns an empty list.
    """
    with _memory_lock:
        return _chat_memory.get(session_id, [])

def add_message(session_id: str, role: str, content: str) -> None:
    """
    Append a new interaction to the session memory.
    """
    with _memory_lock:
        if session_id not in _chat_memory:
            _chat_memory[session_id] = []
        
        _chat_memory[session_id].append({"role": role, "content": content})

def trim_memory(session_id: str, max_messages: int = 10) -> None:
    """
    Prune session memory to maintain only the most recent 'max_messages'.
    This prevents context bloat and manages token limits.
    """
    with _memory_lock:
        if session_id in _chat_memory:
            # Keep only the last N messages
            if len(_chat_memory[session_id]) > max_messages:
                _chat_memory[session_id] = _chat_memory[session_id][-max_messages:]

def clear_memory(session_id: str) -> None:
    """Explicitly wipe the memory for a specific session."""
    with _memory_lock:
        if session_id in _chat_memory:
            del _chat_memory[session_id]

def set_memory(session_id: str, messages: List[Dict[str, str]]) -> None:
    """
    Restore the memory of a session from a list of messages.
    Only the last few messages are typically provided to keep context within limits.
    """
    with _memory_lock:
        _chat_memory[session_id] = messages
