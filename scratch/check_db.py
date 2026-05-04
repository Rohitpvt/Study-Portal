import asyncio
import os
from sqlalchemy import text
from app.core.database import engine

async def check_db():
    print("Checking database tables...")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = [row[0] for row in result]
        print(f"Tables found: {tables}")
        
        if "classroom_announcements" in tables:
            print("✅ 'classroom_announcements' table exists.")
            # Check for records
            res = await conn.execute(text("SELECT COUNT(*) FROM classroom_announcements"))
            count = res.scalar()
            print(f"Announcement count: {count}")
        else:
            print("❌ 'classroom_announcements' table MISSING!")

if __name__ == "__main__":
    asyncio.run(check_db())
