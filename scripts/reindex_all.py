import asyncio
import logging
import sys
import os

# Ensure the root project directory is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from app.ai import rag

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("reindex_tool")

async def reindex_all():
    """
    Operational script to perform a full knowledge-base rebuild.
    Clears the existing FAISS index and rebuilds using all approved materials in the database.
    """
    logger.info("Starting full RAG knowledge-base re-indexing...")

    # 1. Clear existing index
    rag.clear_index()
    logger.info("Local index cleared successfully.")

    async with AsyncSessionLocal() as db:
        try:
            # 2. Fetch all approved materials
            logger.info("Fetching approved materials from database...")
            result = await db.execute(
                select(Material).where(Material.is_approved == True)
            )
            materials = result.scalars().all()
            total_count = len(materials)
            
            if total_count == 0:
                logger.warning("No approved materials found in the database. Index will remain empty.")
                return

            logger.info(f"Found {total_count} approved materials. Beginning ingestion...")

            # 3. Build index
            # This handles text extraction, chunking, and embedding in batch
            await rag.build(materials)

            logger.info("Full re-indexing completed.")
            
            # Since rag.build already logs success/failure counts per material 
            # and final chunk count, we don't duplicate logs here.
            
        except Exception as e:
            logger.error(f"Critical failure during re-indexing: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(reindex_all())
