"""
app/background/integrity_worker.py
───────────────────────────────────
Background loop for periodic material integrity checks.
"""

import asyncio
import logging
from datetime import datetime

from app.core.database import AsyncSessionLocal
from app.services.integrity_reconciliation_service import run_global_reconciliation

logger = logging.getLogger("integrity_worker")

# Cadence: Every 30 minutes
CHECK_INTERVAL_SECONDS = 30 * 60

async def integrity_worker_loop():
    """
    Infinite loop that triggers global reconciliation at a fixed interval.
    Started on application startup.
    """
    logger.info("[WORKER] Material Integrity Worker started.")
    
    # Initial delay to let the system stabilize and avoid database locks on startup
    await asyncio.sleep(10)
    
    while True:
        try:
            logger.info(f"[WORKER] Triggering periodic integrity scan at {datetime.now()}...")
            
            async with AsyncSessionLocal() as db:
                await run_global_reconciliation(db)
                
            logger.info(f"[WORKER] Scan completed. Sleeping for {CHECK_INTERVAL_SECONDS/60} minutes.")
            
        except Exception as e:
            logger.error(f"[WORKER] Fatal error in integrity loop: {e}")
            # Wait a bit before retrying to avoid tight error loops
            await asyncio.sleep(60)
            
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
