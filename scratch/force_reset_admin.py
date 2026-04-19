import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password
import sqlalchemy as sa

async def ResetAdmin():
    async with AsyncSessionLocal() as db:
        print("Checking for admin user: admin@christuniversity.in")
        stmt = sa.select(User).where(User.email == "admin@christuniversity.in")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        target_password = "AdminPass1!"
        hashed_pw = hash_password(target_password)
        
        if user:
            print(f"Updating existing admin user...")
            user.hashed_password = hashed_pw
            user.role = Role.ADMIN
            user.is_active = True
        else:
            print(f"Creating new admin user...")
            user = User(
                email="admin@christuniversity.in",
                hashed_password=hashed_pw,
                full_name="Global System Admin",
                role=Role.ADMIN,
                is_active=True
            )
            db.add(user)
            
        await db.commit()
        print(f"SUCCESS: Admin password reset to: {target_password}")

if __name__ == "__main__":
    asyncio.run(ResetAdmin())
