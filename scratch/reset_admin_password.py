import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password

async def reset_admin():
    async with AsyncSessionLocal() as db:
        email = "rohit.ghosh@mca.christuniversity.in"
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {email} found. Resetting password...")
            user.hashed_password = hash_password("admin123")
            await db.commit()
            print("Password reset to 'admin123'")
        else:
            print(f"User {email} not found.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
