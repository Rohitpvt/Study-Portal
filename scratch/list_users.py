import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def list_users():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.email, User.full_name, User.role, User.is_active).order_by(User.role, User.email))
        rows = res.all()
        print(f"{'EMAIL':<45} {'NAME':<25} {'ROLE':<10} {'ACTIVE'}")
        print("-" * 90)
        for email, name, role, active in rows:
            print(f"{email:<45} {name or 'N/A':<25} {role.value:<10} {active}")

if __name__ == "__main__":
    asyncio.run(list_users())
