import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        print("\n--- MATERIALS ---")
        res = await db.execute(text('SELECT id, title, course, subject, category, file_key, file_url, file_path FROM materials LIMIT 5'))
        for row in res.fetchall():
            print(row)
            
        print("\n--- USERS ---")
        res = await db.execute(text('SELECT id, email, course FROM users LIMIT 5'))
        for row in res.fetchall():
            print(row)

if __name__ == "__main__":
    asyncio.run(check())
