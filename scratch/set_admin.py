import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role

async def make_admin():
    async with AsyncSessionLocal() as session:
        # Demote all current admins to STUDENT securely
        await session.execute(
            update(User)
            .where(User.role == Role.ADMIN)
            .values(role=Role.STUDENT, is_active=True)
        )
        await session.commit()
        print("Demoted all previous ADMINs to STUDENT.")
        
        # Promote the precise target
        target_email = "rohit.ghosh@mca.christuniversity.in"
        result = await session.execute(select(User).where(User.email == target_email))
        target_user = result.scalar_one_or_none()
        
        if target_user:
            target_user.role = Role.ADMIN
            await session.commit()
            print(f"Successfully elevated {target_email} to Global Admin!")
        else:
            print(f"FAILED: The account {target_email} does not exist in the database yet. Please register via the UI first.")

if __name__ == "__main__":
    asyncio.run(make_admin())
