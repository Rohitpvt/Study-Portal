"""
app/background/ai_tasks.py
───────────────────────────
FastAPI BackgroundTask entry points.
These functions are passed to BackgroundTasks.add_task() and run
after the HTTP response is sent — they must create their own DB session.
"""

import logging

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.contribution import Contribution
from app.services.ai_service import run_ai_review

logger = logging.getLogger(__name__)


async def run_ai_review_task(contribution_id: str) -> None:
    """
    Background task: fetch the contribution and run full AI review.
    Creates its own AsyncSession because the request session is closed.
    """
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Contribution).where(Contribution.id == contribution_id)
            )
            contribution = result.scalar_one_or_none()

            if not contribution:
                logger.error(f"Background task: contribution {contribution_id} not found.")
                return

            await run_ai_review(contribution, db)

        except Exception as e:
            logger.error(
                f"Unhandled error in ai_review background task "
                f"(contribution_id={contribution_id}): {e}"
            )


async def run_index_update_task(material_id: str) -> None:
    """
    Background task: incrementally add a newly approved material to the FAISS index.

    Must open its own DB session — the approval request's session is already
    committed and closed by the time this runs.

    Fail-safe contract:
      - Any exception is caught and logged.
      - The admin's approval response is NEVER blocked by this task.
    """
    from app.models.material import Material
    from app.ai import rag

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Material).where(Material.id == material_id)
            )
            material = result.scalar_one_or_none()

            if not material:
                logger.error(
                    f"Index update task: material {material_id} not found in DB. "
                    "Skipping FAISS index update."
                )
                return

            success = await rag.index_one(material)

            from app.models.material import MaterialIntegrityStatus
            from datetime import datetime, timezone

            if success:
                material.integrity_status = MaterialIntegrityStatus.available
                material.integrity_message = "Processing complete: Document indexed in AI Knowledge Base."
                material.repair_suggestion = None
                logger.info(f"Index update task: SUCCESS for {material_id}")
            else:
                material.integrity_status = MaterialIntegrityStatus.indexing_failed
                material.integrity_message = "AI Indexing failed: Document produced no searchable chunks."
                material.repair_suggestion = "Ensure the file contains readable text or Redo Pipeline."
                logger.warning(f"Index update task: FAILED for {material_id}")

            material.last_reconciliation_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            logger.error(
                f"Unhandled error in index_update background task "
                f"(material_id={material_id}): {e}",
                exc_info=True,
            )
            # Try to mark as processing_failed if DB is still usable
            try:
                # We need a fresh session or reuse if still open
                result = await db.execute(select(Material).where(Material.id == material_id))
                mat = result.scalar_one_or_none()
                if mat:
                    mat.integrity_status = MaterialIntegrityStatus.processing_failed
                    mat.integrity_message = f"Critical Pipeline Error: {str(e)}"
                    mat.repair_suggestion = "Retry processing pipeline or check system logs."
                    await db.commit()
            except:
                pass
async def run_index_remove_task(material_id: str) -> None:
    """
    Background task: remove a material from the FAISS index.
    
    Safe contract:
      - Any exception is caught and logged.
      - The admin's delete response is NEVER blocked by this task.
    """
    from app.ai import rag

    try:
        success = rag.remove_material(material_id)
        if success:
            logger.info(f"Index remove task: Material {material_id} removed from FAISS.")
        else:
            logger.warning(f"Index remove task: Material {material_id} was not found in index or removal skipped.")
    except Exception as e:
        logger.error(
            f"Unhandled error in index_remove background task "
            f"(material_id={material_id}): {e}",
            exc_info=True,
        )


# ── Validation Pipeline Task (NEW) ───────────────────────────────────────────
# Re-exported here so callers can import from the central background tasks module.
from app.services.validation_runner_service import run_validation_pipeline_task  # noqa: E402, F401
