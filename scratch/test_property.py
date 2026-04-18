import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from app.schemas.material import MaterialOut
from sqlalchemy import select

async def test_schema():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Material).limit(1))
        m = res.scalar_one_or_none()
        if m:
            print(f"Model Property file_url: {m.file_url}")
            out = MaterialOut.model_validate(m)
            print(f"Pydantic schema file_url: {out.file_url}")
        else:
            print("No materials found in DB")

if __name__ == "__main__":
    asyncio.run(test_schema())
