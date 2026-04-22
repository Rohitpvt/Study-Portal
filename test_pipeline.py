"""Quick pipeline test: reset contribution to PROCESSING_FAILED, then run pipeline."""
import asyncio
import logging

logging.basicConfig(level=logging.WARNING)
# Only show pipeline and extractor logs
logging.getLogger("validation_pipeline").setLevel(logging.INFO)
logging.getLogger("app.utils.text_extractor").setLevel(logging.INFO)

async def main():
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.contribution import Contribution, ProcessingStatus
    from app.services.validation_runner_service import run_validation_pipeline

    cid = "c2e60cfc-ae9b-4014-8a61-3cdc64ec5ff7"

    async with AsyncSessionLocal() as db:
        # 1. Reset to UPLOAD_RECEIVED (simulating what reprocess_contribution does)
        res = await db.execute(select(Contribution).where(Contribution.id == cid))
        c = res.scalar_one()
        c.processing_status = ProcessingStatus.UPLOAD_RECEIVED
        c.processing_started_at = None
        c.processing_completed_at = None
        c.final_recommendation = None
        c.student_feedback_message = None
        c.ai_plagiarism_score = None
        c.ai_grammar_score = None
        c.ai_quality_score = None
        c.ai_feedback = None
        await db.commit()
        print(f"[RESET] {cid[:8]} -> UPLOAD_RECEIVED")

        # 2. Run the pipeline
        print("[START] Running validation pipeline...")
        await run_validation_pipeline(cid, db)

        # 3. Check result
        await db.expire_all()
        res2 = await db.execute(select(Contribution).where(Contribution.id == cid))
        c2 = res2.scalar_one()
        print(f"\n[RESULT] Status: {c2.processing_status}")
        print(f"[RESULT] Recommendation: {c2.final_recommendation}")
        print(f"[RESULT] Feedback: {c2.student_feedback_message}")

asyncio.run(main())
