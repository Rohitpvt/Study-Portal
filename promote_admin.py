import asyncio
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def promote_user():
    async with AsyncSessionLocal() as db:
        await db.execute(update(User).where(User.email == 'test_agent@christuniversity.in').values(role='admin'))
        await db.commit()
    print("User updated to admin.")

if __name__ == "__main__":
    asyncio.run(promote_user())
