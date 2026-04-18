import asyncio
import json
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.services import chatbot_service
from app.models.user import User

async def test_library_intent():
    async with AsyncSessionLocal() as db:
        # 1. Get a test user
        user_stmt = select(User).limit(1)
        res = await db.execute(user_stmt)
        user = res.scalar_one_or_none()
        
        test_queries = [
            "How many notes are there?",
            "What subjects are available?",
            "What topics do you have for Machine Learning?",
            "List all DBMS materials",
            "How are you?"
        ]
        
        print(f"{'Query':<50} | {'Mode':<10} | {'Answer'}")
        print("-" * 120)
        
        for q in test_queries:
            resp = await chatbot_service.ask(
                query=q,
                user_id=user.id,
                session_id=None,
                db=db
            )
            short_answer = resp.answer.replace('\n', ' ')[:60] + "..."
            print(f"{q:<50} | {resp.mode:<10} | {short_answer}")
            
            # Basic validation
            if q == "How are you?":
                assert resp.mode == "general"
            else:
                assert resp.mode in ["library", "document"] # "document" might be returned if FAISS hits (legacy), but library is expected now

if __name__ == "__main__":
    asyncio.run(test_library_intent())
