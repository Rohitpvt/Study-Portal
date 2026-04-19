import asyncio
from sqlalchemy import update
from app.core.database import engine
from app.models.user import User, Role
from app.core.security import hash_password

async def fix_admin():
    async with engine.begin() as conn:
        # Re-hash to be 100% sure of compatibility
        hashed = hash_password("Admin@123")
        await conn.execute(
            update(User)
            .where(User.email == "rohit.ghosh@mca.christuniversity.in")
            .values(
                hashed_password=hashed,
                role=Role.ADMIN,
                is_active=True
            )
        )
        print("FIX SUCCESS: rohit.ghosh@mca.christuniversity.in updated to Admin@123 (Active/Admin).")

if __name__ == "__main__":
    asyncio.run(fix_admin())
