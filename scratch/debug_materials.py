import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text('SELECT title, category FROM materials'))
        for row in res.all():
            print(f"Title: {row[0]}, Category: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check())
