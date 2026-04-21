import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print("--- Users in Database ---")
        for u in users:
            print(f"Email: {u.email} | Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(check_users())
