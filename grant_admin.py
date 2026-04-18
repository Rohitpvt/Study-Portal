import asyncio
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password

async def grant_admin(email: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            user.role = Role.ADMIN
            await db.commit()
            print(f"SUCCESS: Promoted existing account '{email}' to ADMIN.")
        else:
            new_user = User(
                id=str(uuid.uuid4()),
                email=email,
                full_name="Rohit Ghosh",
                hashed_password=hash_password("AdminSecurePassword123!"),
                role=Role.ADMIN,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print(f"SUCCESS: Created new ADMIN account for '{email}'. Password: AdminSecurePassword123!")

if __name__ == "__main__":
    asyncio.run(grant_admin("rohit.ghosh@mca.christuniversity.in"))
