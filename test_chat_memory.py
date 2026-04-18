import os
import sys
import uuid
import logging

# Add project root to path
sys.path.append(os.getcwd())

from app.services.llm_service import get_chat_response
from app.services import memory_service
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)

def test_multi_turn_conversation():
    session_id = str(uuid.uuid4())
    print(f"\n--- Starting Multi-Turn Chat Simulation [Session: {session_id}] ---")
    
    # ── Turn 1 ───────────────────────────────────────────────────────────────
    query_1 = "What is Christ University known for?"
    print(f"\nUSER: {query_1}")
    
    messages_1 = [
        {"role": "system", "content": "You are a professional academic AI assistant."},
        {"role": "user", "content": query_1}
    ]
    
    response_1 = get_chat_response(messages_1)
    print(f"AI: {response_1[:150]}...")
    
    # Store in memory
    memory_service.add_message(session_id, "user", query_1)
    memory_service.add_message(session_id, "assistant", response_1)
    
    # ── Turn 2 (Context Dependent) ───────────────────────────────────────────
    query_2 = "Give me 3 more specific details about its Bangalore Central Campus."
    print(f"\nUSER: {query_2} (Testing Memory)")
    
    # Retrieve history
    history = memory_service.get_memory(session_id)
    
    messages_2 = [
        {"role": "system", "content": "You are a professional academic AI assistant."}
    ]
    messages_2.extend(history)
    messages_2.append({"role": "user", "content": query_2})
    
    response_2 = get_chat_response(messages_2)
    print(f"AI: {response_2[:300]}...")
    
    # ── Turn 3 (Truncation Test) ─────────────────────────────────────────────
    print("\n--- Testing Memory Trimming ---")
    for i in range(15):
        memory_service.add_message(session_id, "user", f"Dummy message {i}")
        memory_service.add_message(session_id, "assistant", f"Dummy response {i}")
        memory_service.trim_memory(session_id, max_messages=10)
    
    final_history = memory_service.get_memory(session_id)
    print(f"Final Memory Size: {len(final_history)} (Expected: 10)")
    
    if len(final_history) == 10:
        print("\nRESULT: SUCCESS (Memory persistence and trimming functional)")
    else:
        print("\nRESULT: FAILED (Memory size mismatch)")

if __name__ == "__main__":
    if not settings.NVIDIA_API_KEY:
        print("ERROR: NVIDIA_API_KEY not found in environment.")
    else:
        test_multi_turn_conversation()
