import asyncio
from app.core.database import AsyncSessionLocal
from app.models.contribution import Contribution
from sqlalchemy import select

async def reset():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Contribution).limit(1))
        c = res.scalar_one_or_none()
        if c:
            c.status = "pending"
            await db.commit()
            print(f"Reset contribution {c.id} to PENDING for testing.")
        else:
            print("No contributions found.")

if __name__ == "__main__":
    asyncio.run(reset())
