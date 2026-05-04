import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services import chatbot_service
from app.models.user import User
from sqlalchemy import select

# Configure logging to see the internal steps
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_chatbot():
    print("--- Local Chatbot Test ---")
    async with AsyncSessionLocal() as db:
        # 1. Fetch a user
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            print("No users found in DB. Test aborted.")
            return
        
        print(f"Testing for user: {user.email}")
        
        # 2. Call the chatbot service
        print("Sending message: 'What is deep learning?'...")
        try:
            response = await chatbot_service.ask(
                query="What is deep learning?",
                user_id=user.id,
                session_id=None, # Fresh session
                db=db
            )
            print("\nAI Response:")
            print(response.answer)
            print(f"\nMode: {response.mode}")
            print(f"Sources: {len(response.sources)}")
            print("\nTest Successful!")
        except Exception as e:
            print(f"\nTest Failed with Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chatbot())
