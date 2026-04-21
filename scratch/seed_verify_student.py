import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password

async def create_verify_student():
    async with AsyncSessionLocal() as db:
        user = User(
            email="reconcile.student@mca.christuniversity.in",
            full_name="Reconcile Student",
            hashed_password=hash_password("StudentPass1!"),
            role=Role.STUDENT,
            is_active=True
        )
        db.add(user)
        try:
            await db.commit()
            print("Student Created: reconcile.student@mca.christuniversity.in / StudentPass1!")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(create_verify_student())
