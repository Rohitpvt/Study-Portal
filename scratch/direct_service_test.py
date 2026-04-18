import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services import chatbot_service
from app.models.user import User
from sqlalchemy import select

async def direct_test():
    async with AsyncSessionLocal() as db:
        # Get a real user ID
        res = await db.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("❌ No user found in DB.")
            return
            
        queries = [
            "How many notes are there?",
            "List all physics materials",
            "What topics do you have?",
            "How are you?"
        ]
        
        print(f"Testing direct service calls for user: {user.email}")
        print("-" * 50)
        
        for q in queries:
            print(f"Query: {q}")
            response = await chatbot_service.ask(
                query=q,
                user_id=user.id,
                session_id=None,
                db=db
            )
            print(f"Mode: {response.mode}")
            print(f"Answer Sample: {response.answer[:80]}...")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(direct_test())
