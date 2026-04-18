"""
app/services/ai_service.py
───────────────────────────
AI-powered document pipeline processing.

Calls the modular `app/ai/` packages for:
    - Text Extraction (via PyMuPDF)
    - Grammar & Quality checks (Mock)
    - Plagiarism checks (Mock)

Designed to run as a FastAPI BackgroundTask so it doesn't block HTTP responses.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contribution import Contribution, ContributionStatus
from app.utils.text_extractor import extract_text
from app.ai.plagiarism import run_check as check_plagiarism
from app.ai.reviewer import gpt_review

logger = logging.getLogger(__name__)


async def run_ai_review(contribution: Contribution, db: AsyncSession) -> None:
    """
    Pipeline executing extracting text and calculating AI metrics for a contribution.
    Saves the generated AI report direct to the database.
    """
    logger.info(f"Starting AI review pipeline for contribution {contribution.id}")
    try:
        # Step 1: Extract Text
        extracted_data = await extract_text(contribution.file_path)
        text = " ".join([p["text"] for p in extracted_data if "text" in p])

        if not text.strip():
            contribution.ai_feedback         = "Could not extract text from the uploaded file."
            contribution.ai_plagiarism_score = 0.0
            contribution.ai_grammar_score    = 0.0
            contribution.ai_quality_score    = 0.0
            contribution.status              = ContributionStatus.AI_REVIEWED
            await db.commit()
            return

        # Step 2: Run Plagiarism and Grammar Checks (Placeholders)
        plagiarism_score = await check_plagiarism(text, db)
        review_result    = await gpt_review(text)

        # Step 3: Populate AI Report inside Contribution DB Record
        contribution.ai_plagiarism_score = plagiarism_score
        contribution.ai_grammar_score    = float(review_result.get("grammar_score", 0))
        contribution.ai_quality_score    = float(review_result.get("quality_score", 0))
        contribution.ai_feedback         = review_result.get("feedback", "")
        
        contribution.status              = ContributionStatus.AI_REVIEWED

        await db.commit()
        logger.info(
            f"AI pipeline complete for contribution {contribution.id}: "
            f"plagiarism level={plagiarism_score:.2f}, "
            f"grammar score={contribution.ai_grammar_score}, "
            f"quality score={contribution.ai_quality_score}"
        )

    except Exception as e:
        logger.error(f"AI review failed for contribution {contribution.id}: {e}")
        contribution.ai_feedback = f"AI review encountered a fatal error: {str(e)}"
        contribution.status      = ContributionStatus.AI_REVIEWED
        await db.commit()
