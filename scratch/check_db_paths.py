import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Material.title, Material.file_path))
        items = res.all()
        for i in items:
            print(f"Title: {i.title} | Path: {i.file_path}")

if __name__ == "__main__":
    asyncio.run(check())
