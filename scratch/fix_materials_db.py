import asyncio
from app.core.database import engine
from sqlalchemy import text

async def fix():
    async with engine.begin() as conn:
        await conn.execute(text('UPDATE materials SET integrity_status = lower(integrity_status)'))
        print("Updated all integrity_status to lowercase.")

if __name__ == "__main__":
    asyncio.run(fix())
