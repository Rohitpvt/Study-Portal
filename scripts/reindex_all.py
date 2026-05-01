import asyncio
import logging
import sys
import os
import argparse

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

async def reindex_all(dry_run: bool = False):
    """
    Operational script to perform a full knowledge-base rebuild.
    Safely clears the existing FAISS index and rebuilds using strictly healthy materials.
    """
    if dry_run:
        logger.info("Starting safe DRY-RUN RAG knowledge-base re-indexing...")
    else:
        logger.info("Starting full RAG knowledge-base re-indexing...")

    async with AsyncSessionLocal() as db:
        try:
            # Fetch all approved AND healthy materials
            logger.info("Fetching strictly available materials from database...")
            result = await db.execute(
                select(Material).where(
                    Material.is_approved == True,
                    Material.integrity_status == "available"
                )
            )
            materials = result.scalars().all()
            total_count = len(materials)
            
            # Find broken ones just for reporting
            broken_res = await db.execute(
                select(Material).where(
                    Material.is_approved == True,
                    Material.integrity_status != "available"
                )
            )
            broken_materials = broken_res.scalars().all()
            
            logger.info(f"Dry-run Scan: Found {total_count} healthy materials.")
            logger.warning(f"Dry-run Scan: Excluded {len(broken_materials)} broken/missing materials.")
            
            if dry_run:
                logger.info("DRY-RUN COMPLETE. No destructive actions taken.")
                for m in materials:
                    logger.info(f"WOULD INDEX: [{m.id}] {m.title} (Key: {m.file_key})")
                for m in broken_materials:
                    logger.warning(f"WOULD EXCLUDE: [{m.id}] {m.title} (Status: {m.integrity_status})")
                return

            if total_count == 0:
                logger.warning("No available materials found in the database. Index will be cleared and remain empty.")
                rag.clear_index()
                return

            # Destructive Action Starts Here
            rag.clear_index()
            logger.info("Local index cleared successfully.")

            logger.info(f"Beginning ingestion of {total_count} materials...")

            # Build index handles text extraction, chunking, and embedding in batch
            await rag.build(materials)

            logger.info("Full re-indexing completed successfully.")
            
        except Exception as e:
            logger.error(f"Critical failure during re-indexing: {e}", exc_info=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reindex FAISS Vector Store safely.")
    parser.add_argument("--dry-run", action="store_true", help="Preview the reindex without altering FAISS.")
    args = parser.parse_args()
    
    asyncio.run(reindex_all(dry_run=args.dry_run))
