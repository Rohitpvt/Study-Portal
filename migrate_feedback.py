import asyncio
import logging
from sqlalchemy import text, inspect
from app.core.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_db():
    logger.info("Starting safe idempotent DB migration...")
    
    # Run sync function to use SQLAlchemy inspect
    def check_column(conn):
        inspector = inspect(conn)
        columns = [col['name'] for col in inspector.get_columns('chat_messages')]
        return 'feedback' in columns

    async with engine.begin() as conn:
        try:
            has_column = await conn.run_sync(check_column)
            
            if not has_column:
                logger.info("Adding 'feedback' column to 'chat_messages' table...")
                # SQLite and Postgres both support ADD COLUMN
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN feedback VARCHAR(20) NULL;"))
                logger.info("Column 'feedback' added successfully.")
            else:
                logger.info("Column 'feedback' already exists. Skipping.")
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(migrate_db())
