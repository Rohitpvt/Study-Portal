import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.email, User.role))
        users = res.all()
        for user in users:
            print(f"Email: {user[0]}, Role: {user[1]}")

if __name__ == "__main__":
    asyncio.run(check())
