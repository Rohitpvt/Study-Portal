import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Material).limit(5))
        materials = res.scalars().all()
        if not materials:
            print("No materials found.")
            return
        for m in materials:
            print(f"ID: {m.id}")
            print(f"Title: {m.title}")
            print(f"Course: {m.course}")
            print(f"Subject: {m.subject}")
            print(f"Semester: {m.semester}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check())
