
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from sqlalchemy import select, func

async def check_materials():
    async with AsyncSessionLocal() as db:
        count = await db.scalar(select(func.count()).select_from(Material).where(Material.is_approved == True))
        print(f"Approved Materials Count: {count}")
        
        if count > 0:
            result = await db.execute(select(Material.title, Material.subject).where(Material.is_approved == True).limit(5))
            materials = result.all()
            print("Sample Materials:")
            for m in materials:
                print(f"- {m.title} ({m.subject})")

if __name__ == "__main__":
    asyncio.run(check_materials())
