import asyncio
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password

async def grant_student(email: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            user.role = Role.STUDENT
            user.hashed_password = hash_password("StudentSecurePassword123!")
            await db.commit()
            print(f"SUCCESS: Set existing account '{email}' to STUDENT and updated password.")
        else:
            new_user = User(
                id=str(uuid.uuid4()),
                email=email,
                full_name="Tisha Chhabra",
                hashed_password=hash_password("StudentSecurePassword123!"),
                role=Role.STUDENT,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print(f"SUCCESS: Created new STUDENT account for '{email}'. Password: StudentSecurePassword123!")

if __name__ == "__main__":
    asyncio.run(grant_student("tisha.chhabra@mca.christuniversity.in"))
