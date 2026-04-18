import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            # Try to add the column
            await conn.execute(text("ALTER TABLE users ADD COLUMN roll_no VARCHAR(50)"))
            print("Successfully added roll_no column to users table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("Column roll_no already exists. Skipping.")
            else:
                print(f"Error during migration: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
