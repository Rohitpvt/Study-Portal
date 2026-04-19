import asyncio
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.user import User
import sqlalchemy as sa

async def debug():
    print(f"DEBUG: ALLOWED_ORIGINS = {settings.ALLOWED_ORIGINS}")
    print(f"DEBUG: DATABASE_URL = {settings.DATABASE_URL}")
    
    async with AsyncSessionLocal() as db:
        stmt = sa.select(User).where(User.email == "admin@christuniversity.in")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            print(f"DEBUG: Found user {user.email}")
            print(f"DEBUG: User Role: {user.role}")
            print(f"DEBUG: User Is Active: {user.is_active}")
        else:
            print("DEBUG: User admin@christuniversity.in NOT FOUND")

if __name__ == "__main__":
    asyncio.run(debug())
