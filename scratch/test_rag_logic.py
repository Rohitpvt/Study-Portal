import asyncio
import sys
import os
import json

# Ensure we can import from the app directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services import chatbot_service
from app.models.user import User

async def test_rag_logic():
    print("--- STARTING RAG LOGIC TEST ---")
    async with AsyncSessionLocal() as db:
        # Get a real user ID for the session
        from sqlalchemy import select
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("FAILED: No user found in database. Please register first.")
            return

        test_queries = [
            "india president is?",               # Should be general, 0 sources
            "who is the prime minister of india", # Should be general, 0 sources
            "What is Computer Networking?",      # Should be academic (if notes exist), sources > 0
            "hello",                             # Should be greeting, 0 sources
        ]

        for query in test_queries:
            print(f"\nQUERY: '{query}'")
            response = await chatbot_service.ask(
                query=query,
                user_id=user.id,
                session_id=None,
                db=db
            )
            
            print(f"MODE: {response.mode}")
            print(f"SOURCES: {len(response.sources)}")
            print(f"ANSWER START: {response.answer[:100]}...")
            
            # Validation logic
            if "president" in query.lower() or "prime minister" in query.lower():
                if response.mode == "general" and len(response.sources) == 0:
                    print("✅ SUCCESS: Correctly routed to General mode with no sources.")
                else:
                    print("❌ FAILURE: Incorrectly triggered RAG or failed intent check.")
            
            if "networking" in query.lower():
                if response.mode == "document" and len(response.sources) > 0:
                    print("✅ SUCCESS: Correctly handled academic query via RAG.")
                elif response.mode == "general":
                    print("⚠️ NOTE: Handled as General (perhaps no networking notes are indexed?)")

if __name__ == "__main__":
    asyncio.run(test_rag_logic())
