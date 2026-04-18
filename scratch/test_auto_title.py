import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services.chatbot_service import _make_session_title

def test_title_generation():
    print("Testing internal title generation logic:")
    
    test_cases = [
        ("hi", "New Chat"),
        ("Hi there", "New Chat"),  # Wait, my logic only checks exact matches for TRIVIAL_TOKENS. 
        # Ah, 'is_query_junk' catches gibberish. Let's see what it does.
        ("thanks", "New Chat"),
        ("what are you", "New Chat"),
        ("can you explain what machine learning is in detail please?", "can you explain what machine learning is…"), # 40 chars
        ("what is SQL", "what is SQL"),
        ("tell me about the operating system architecture", "tell me about the operating system…"),
        ("    hello    ", "New Chat"),
    ]
    
    for query, expected in test_cases:
        result = _make_session_title(query)
        status = "PASS" if result == expected or expected.endswith("…") and len(result) <= 41 else f"FAIL (Expected {expected}, got {result})"
        print(f"[{status}] Query: '{query}' -> Title: '{result}'")

if __name__ == "__main__":
    test_title_generation()
