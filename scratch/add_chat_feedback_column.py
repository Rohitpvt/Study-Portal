import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_ay8Z9soWwRrg@ep-tiny-resonance-amripcrp.c-5.us-east-1.aws.neon.tech/neondb"

async def run_migration():
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        try:
            # Check if column exists
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='chat_messages' AND column_name='feedback';
            """))
            exists = result.scalar()
            
            if not exists:
                print("Adding 'feedback' column to 'chat_messages' table...")
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN feedback VARCHAR(20) DEFAULT NULL;"))
                print("Successfully added 'feedback' column.")
            else:
                print("Column 'feedback' already exists on 'chat_messages'.")
        except Exception as e:
            print(f"Error executing migration: {e}")
            raise
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
