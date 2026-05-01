import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password
from app.models.base import generate_uuid

async def seed():
    accounts = [
        {"email": "admin1@christuniversity.in", "name": "Admin One", "role": Role.ADMIN, "password": "xmRB^IG1Eq*l"},
        {"email": "student1@mca.christuniversity.in", "name": "Student One", "role": Role.STUDENT, "password": "H7NhehhQ8eC#", "roll_no": "2522001"},
        {"email": "teacher1@christuniversity.in", "name": "Teacher One", "role": Role.TEACHER, "password": "Rockstar@00112233"},
    ]
    
    async with AsyncSessionLocal() as db:
        for acc in accounts:
            result = await db.execute(select(User).where(User.email == acc["email"]))
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"User {acc['email']} already exists. Updating...")
                existing.role = acc["role"]
                existing.hashed_password = hash_password(acc["password"])
                if "roll_no" in acc:
                    existing.roll_no = acc["roll_no"]
            else:
                print(f"Creating user {acc['email']}...")
                user = User(
                    id=generate_uuid(),
                    email=acc["email"],
                    full_name=acc["name"],
                    hashed_password=hash_password(acc["password"]),
                    role=acc["role"],
                    roll_no=acc.get("roll_no"),
                    is_active=True
                )
                db.add(user)
        
        await db.commit()
    print("Seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed())
