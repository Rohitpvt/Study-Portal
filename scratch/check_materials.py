import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.models.material import Material
from sqlalchemy import select

async def check_conversion_status():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Material))
        materials = result.scalars().all()
        print(f"{'Title':<30} | {'Status':<10} | {'File Key':<40} | {'Original Key'}")
        print("-" * 120)
        for m in materials:
            status = getattr(m, 'conversion_status', 'N/A')
            orig = getattr(m, 'original_file_key', 'N/A')
            title = (m.title or "No Title")[:30]
            fkey = (m.file_key or "No Key")[:40]
            print(f"{title:<30} | {str(status):<10} | {fkey:<40} | {orig}")

if __name__ == "__main__":
    asyncio.run(check_conversion_status())
