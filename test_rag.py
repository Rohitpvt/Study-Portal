import asyncio
import os
import sys
import json

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.services.chatbot_service import ask
from app.ai.rag import load_index
import logging

logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

async def main():
    load_index()
    results = []

    async with AsyncSessionLocal() as db:
        r1 = await ask("hi", "test_user_1", "test_session_1", db)
        results.append({"test": "hi", "answer": r1.answer, "mode": r1.mode})

        r2 = await ask("what is AI", "test_user_1", "test_session_1", db)
        results.append({"test": "what is AI", "answer": r2.answer, "mode": r2.mode})

        r3 = await ask("DBMS normalization", "test_user_1", "test_session_1", db)
        results.append({"test": "DBMS normalization", "answer": r3.answer, "mode": r3.mode, "sources": r3.sources})

        r4 = await ask("How to build a space shuttle?", "test_user_1", "test_session_1", db)
        results.append({"test": "Random fallback", "answer": r4.answer, "mode": r4.mode, "sources": r4.sources})

    with open("test_results.json", "w") as f:
        json.dump(results, f, indent=4)

if __name__ == "__main__":
    asyncio.run(main())
