import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, title, status, processing_status FROM contributions"))
        for row in res.all():
            print(f"ID: {row[0]} | Title: {row[1]} | Status: {row[2]} | PStatus: {row[3]}")

if __name__ == "__main__":
    asyncio.run(check())
