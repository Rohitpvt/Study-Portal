import asyncio
from app.core.database import engine
from sqlalchemy import text
from app.services import contribution_service
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def test_delete():
    async with AsyncSessionLocal() as db:
        # 1. Find a failed contribution
        res = await db.execute(text("SELECT id, contributor_id FROM contributions WHERE processing_status = 'processing_failed' LIMIT 1"))
        row = res.fetchone()
        if not row:
            print("No failed contribution found")
            return
        
        contrib_id = row[0]
        user_id = row[1]
        print(f"Found contribution: {contrib_id} by user: {user_id}")
        
        # 2. Get the user
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        
        # 3. Call service delete
        try:
            success = await contribution_service.delete_contribution(contrib_id, user, db)
            print(f"Delete success: {success}")
        except Exception as e:
            print(f"Delete failed with error: {e}")

if __name__ == "__main__":
    asyncio.run(test_delete())
