import asyncio
from sqlalchemy import select
from app.core.database import engine
from app.models.user import User, Role
from app.services.auth_service import hash_password

async def check_admin():
    async with engine.connect() as conn:
        result = await conn.execute(select(User).where(User.role == Role.ADMIN))
        admins = result.fetchall()
        if not admins:
            print("No admin users found in database.")
        else:
            print("Admins found:")
            for admin in admins:
                print(f"Email: {admin.email}, Full Name: {admin.full_name}")

if __name__ == "__main__":
    asyncio.run(check_admin())
