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
    Safely clears the existing FAISS index and rebuilds using all indexable materials.
    
    Indexable = approved AND (available OR indexing_failed).
    
    'indexing_failed' materials have valid S3 files but couldn't be incrementally
    indexed (e.g., because the FAISS index didn't exist yet after a wipe).
    They are valid candidates for a batch rebuild.
    
    Truly broken statuses ('missing_file', 'processing_failed') are always excluded.
    """
    from app.models.material import MaterialIntegrityStatus
    from sqlalchemy import or_
    from datetime import datetime, timezone

    if dry_run:
        logger.info("Starting safe DRY-RUN RAG knowledge-base re-indexing...")
    else:
        logger.info("Starting full RAG knowledge-base re-indexing...")

    # Statuses that indicate the file exists and is valid for indexing
    INDEXABLE_STATUSES = [
        MaterialIntegrityStatus.available,
        MaterialIntegrityStatus.indexing_failed,
    ]

    # Statuses that indicate the file is genuinely broken/missing
    EXCLUDED_STATUSES = [
        MaterialIntegrityStatus.missing_file,
        MaterialIntegrityStatus.processing_failed,
    ]

    async with AsyncSessionLocal() as db:
        try:
            # Fetch all approved materials with indexable statuses
            logger.info("Fetching indexable materials from database...")
            result = await db.execute(
                select(Material).where(
                    Material.is_approved == True,
                    or_(*(Material.integrity_status == s for s in INDEXABLE_STATUSES))
                )
            )
            materials = result.scalars().all()
            total_count = len(materials)
            
            # Find truly broken ones just for reporting
            broken_res = await db.execute(
                select(Material).where(
                    Material.is_approved == True,
                    or_(*(Material.integrity_status == s for s in EXCLUDED_STATUSES))
                )
            )
            broken_materials = broken_res.scalars().all()
            
            logger.info(f"Scan: Found {total_count} indexable materials.")
            if broken_materials:
                logger.warning(f"Scan: Excluded {len(broken_materials)} broken/missing materials.")
            
            if dry_run:
                logger.info("DRY-RUN COMPLETE. No destructive actions taken.")
                for m in materials:
                    logger.info(f"WOULD INDEX: [{m.id}] {m.title} (Key: {m.file_key}, Status: {m.integrity_status})")
                for m in broken_materials:
                    logger.warning(f"WOULD EXCLUDE: [{m.id}] {m.title} (Status: {m.integrity_status})")
                return

            if total_count == 0:
                logger.warning("No indexable materials found in the database. Index will be cleared and remain empty.")
                rag.clear_index()
                return

            # Destructive Action Starts Here
            rag.clear_index()
            logger.info("Local index cleared successfully.")

            logger.info(f"Beginning ingestion of {total_count} materials...")

            # Build index handles text extraction, chunking, and embedding in batch
            await rag.build(materials)

            # Post-build: update all successfully indexed materials to 'available'
            for m in materials:
                m.integrity_status = MaterialIntegrityStatus.available
                m.integrity_message = "Processing complete: Document indexed in AI Knowledge Base."
                m.repair_suggestion = None
                m.last_reconciliation_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Updated {total_count} materials to 'available' status.")

            logger.info("Full re-indexing completed successfully.")
            
        except Exception as e:
            logger.error(f"Critical failure during re-indexing: {e}", exc_info=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reindex FAISS Vector Store safely.")
    parser.add_argument("--dry-run", action="store_true", help="Preview the reindex without altering FAISS.")
    args = parser.parse_args()
    
    asyncio.run(reindex_all(dry_run=args.dry_run))
