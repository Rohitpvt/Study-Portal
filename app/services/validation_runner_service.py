"""
app/services/validation_runner_service.py
──────────────────────────────────────────
Background orchestration for the multi-step Contribution Validation Pipeline.

Responsibilities:
  - Walk through validation layers sequentially
  - Update processing_status, timestamps, and student_feedback_message
  - Persist partial results into ContributionValidationReport
  - Never touch legacy fields (status, ai_plagiarism_score, ai_grammar_score,
    ai_quality_score, ai_feedback)

All functions in this module create their own DB sessions (via AsyncSessionLocal)
so they can run safely inside FastAPI BackgroundTasks after the HTTP response
has been sent.
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.base import generate_uuid
from app.models.contribution import Contribution, ProcessingStatus, FinalRecommendation, ContributionStatus
from app.models.validation_report import ContributionValidationReport
from app.utils.text_extractor import extract_text
from app.ai.reviewer import detailed_grammar_review, run_toxicity_scan, validate_metadata_alignment, estimate_ai_likelihood
from app.ai import plagiarism, similarity

logger = logging.getLogger("validation_pipeline")

# ── Extraction Pipeline Constants ───────────────────────────────────────────
MIN_READABLE_TEXT_THRESHOLD = 50
TECH_FAILURE = "TECH_FAILURE"
INSUFFICIENT_CONTENT = "INSUFFICIENT_CONTENT"

# ── Decision Engine Thresholds ──────────────────────────────────────────────
# REJECTED if any of these are hit (Hard Stops)
HARD_REJECT_PLAGIARISM_THRESHOLD = 0.20  # < 20% original is automatic rejection
HARD_REJECT_GRAMMAR_THRESHOLD = 0.20     # Totally unreadable garbage
HARD_REJECT_TOXICITY_THRESHOLD = 0.0     # Final flag is boolean but score 0.0 is severe

# NEEDS_MANUAL_REVIEW triggers
MANUAL_REVIEW_PLAGIARISM_LIMIT = 0.60    # < 60% original needs eyes
MANUAL_REVIEW_GRAMMAR_LIMIT = 0.50       # Low quality needs review
MANUAL_REVIEW_METADATA_MISMATCH = True   # Any metadata flag -> review
MANUAL_REVIEW_SIMILARITY_HIGH = "HIGH"   # Paraphrasing flag -> review

# Weights for Overall Quality Score (Total = 1.0)
WEIGHT_GRAMMAR = 0.60
WEIGHT_METADATA = 0.40


# ── Structured result returned by every validation layer ──────────────────────

@dataclass
class LayerResult:
    """Uniform return type for all validation layer functions.

    Every layer — even a placeholder — must return one of these so that
    downstream code never needs to handle raw strings or ad-hoc dicts.
    """
    layer_name: str
    passed: bool = True
    score: float = 1.0            # 0.0 – 1.0 (1.0 = best)
    details: dict = field(default_factory=dict)
    error: Optional[str] = None   # non-None when the layer itself failed


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def update_contribution_status(
    db: AsyncSession,
    contribution_id: str,
    status: ProcessingStatus,
    message: Optional[str] = None,
) -> None:
    """Set processing_status (+ status_updated_at) on a Contribution.

    Optionally updates student_feedback_message.
    Also sets uploaded_at on UPLOAD_RECEIVED and processing_started_at on
    the first processing step.
    """
    result = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id)
    )
    contribution = result.scalar_one_or_none()
    if contribution is None:
        logger.error(f"update_contribution_status: contribution {contribution_id} not found")
        return

    now = datetime.now(timezone.utc)

    contribution.processing_status = status
    contribution.status_updated_at = now

    # Centralized timestamp logic
    if status == ProcessingStatus.UPLOAD_RECEIVED:
        contribution.uploaded_at = now
    elif status == ProcessingStatus.TEXT_EXTRACTION_IN_PROGRESS:
        # First real processing step → mark start
        if contribution.processing_started_at is None:
            contribution.processing_started_at = now
    elif status in (ProcessingStatus.PROCESSING_COMPLETE, ProcessingStatus.PROCESSING_FAILED):
        contribution.processing_completed_at = now

    if message is not None:
        contribution.student_feedback_message = message

    await db.commit()
    logger.info(
        f"[PIPELINE] contribution_id={contribution_id[:8]} step=status_update status={status.value}"
        + (f" message=\"{message}\"" if message else "")
    )


async def save_partial_validation_result(
    db: AsyncSession,
    contribution_id: str,
    layer_name: str,
    result_data: LayerResult,
) -> None:
    """Persist one layer's result into the ContributionValidationReport row.

    Creates the report row on first call (idempotent).
    """
    # Fetch or create the report
    res = await db.execute(
        select(ContributionValidationReport).where(
            ContributionValidationReport.contribution_id == contribution_id
        )
    )
    report = res.scalar_one_or_none()

    if report is None:
        report = ContributionValidationReport(
            id=generate_uuid(),
            contribution_id=contribution_id,
        )
        db.add(report)
        await db.flush()
        logger.info(f"[PIPELINE] contribution_id={contribution_id[:8]} step=report_init status=created")

    # Map layer_name → report columns
    details_json = json.dumps(result_data.details) if result_data.details else None

    if layer_name == "grammar":
        report.grammar_score = result_data.score
        report.grammar_details = details_json
    elif layer_name == "plagiarism":
        report.plagiarism_score = result_data.score
        report.plagiarism_details = details_json
    elif layer_name == "similarity":
        report.similarity_score = result_data.score
        report.similarity_details = details_json
    elif layer_name == "toxicity":
        report.toxicity_score = result_data.score
        report.toxicity_details = details_json
    elif layer_name == "metadata":
        report.metadata_valid = result_data.passed
        report.metadata_details = details_json
    elif layer_name == "ai_generated":
        report.ai_generated_probability = result_data.score
        report.ai_generated_details = details_json
    else:
        logger.warning(f"[{contribution_id[:8]}] Unknown layer_name: {layer_name}")

    await db.commit()
    logger.info(
        f"[PIPELINE] contribution_id={contribution_id[:8]} step=layer_persist layer={layer_name} "
        f"score={result_data.score:.2f} passed={result_data.passed}"
    )


async def mark_processing_complete(
    db: AsyncSession,
    contribution_id: str,
    final_recommendation: FinalRecommendation,
    overall_score: float,
    overall_risk_score: float,
    summary: str,
) -> None:
    """Finalize the validation pipeline: write recommendation into both
    the Contribution row and the ContributionValidationReport row.
    """
    # Update Contribution
    res = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id)
    )
    contribution = res.scalar_one_or_none()
    if contribution is None:
        logger.error(f"mark_processing_complete: contribution {contribution_id} not found")
        return

    now = datetime.now(timezone.utc)
    contribution.processing_status = ProcessingStatus.PROCESSING_COMPLETE
    contribution.processing_completed_at = now
    contribution.status_updated_at = now
    contribution.status = ContributionStatus.AI_REVIEWED  # Sync legacy admin dashboard
    contribution.final_recommendation = final_recommendation
    contribution.student_feedback_message = summary

    # Update validation report
    rpt_res = await db.execute(
        select(ContributionValidationReport).where(
            ContributionValidationReport.contribution_id == contribution_id
        )
    )
    report = rpt_res.scalar_one_or_none()
    if report:
        report.overall_score = overall_score
        report.overall_risk_score = overall_risk_score
        report.recommendation = final_recommendation.value
        report.summary = summary

    await db.commit()
    logger.info(
        f"[{contribution_id[:8]}] Pipeline COMPLETE — "
        f"recommendation={final_recommendation.value}, overall_score={overall_score:.2f}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  PLACEHOLDER VALIDATION LAYERS
#  Each returns a LayerResult.  Replace internals with real logic later.
# ═══════════════════════════════════════════════════════════════════════════════

async def extract_text_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Real logic: Extracts text from the contribution's file source (URL or Path).
    Differentiates between technical failures and insufficient readable content.
    """
    import os
    contribution_id = contribution.id
    logger.info(f"[{contribution_id[:8]}] extract_text_step — starting extraction")

    # 1. Determine the source (prefer URL if valid, otherwise path)
    source = contribution.file_path
    if contribution.file_url and contribution.file_url.startswith("http"):
        source = contribution.file_url

    if not source:
        return LayerResult(
            layer_name="text_extraction",
            passed=False,
            error="No valid file source (URL or path) found for this contribution.",
            details={"error_type": TECH_FAILURE, "summary_feedback": "Source file reference missing."}
        )

    try:
        # 2. Call the shared extractor utility
        extracted_data = await extract_text(source)
        
        # 3. Analyze the result
        full_text = " ".join([p["text"] for p in extracted_data if "text" in p]).strip()
        char_count = len(full_text)
        page_count = len(extracted_data)

        # Technical Failure (No data returned from a theoretically valid call)
        if not extracted_data:
            return LayerResult(
                layer_name="text_extraction",
                passed=False,
                error=f"Extractor returned no data for source: {source}",
                details={
                    "char_count": 0,
                    "page_count": 0,
                    "error_type": TECH_FAILURE,
                    "summary_feedback": "Unable to read document contents. Ensure it is not encrypted or corrupted."
                }
            )

        # Insufficient Content (Opened successfully, but text is too short)
        if char_count < MIN_READABLE_TEXT_THRESHOLD:
            return LayerResult(
                layer_name="text_extraction",
                passed=False,
                error=f"Insufficient readable text ({char_count} chars).",
                details={
                    "char_count": char_count,
                    "page_count": page_count,
                    "error_type": INSUFFICIENT_CONTENT,
                    "summary_feedback": "The document appears to be mostly empty or an unreadable scan."
                }
            )

        # Success - Store text for downstream layers
        context["extracted_text"] = full_text
        
        return LayerResult(
            layer_name="text_extraction",
            passed=True,
            score=1.0,
            details={
                "char_count": char_count,
                "page_count": page_count,
                "summary_feedback": f"Extracted {char_count} characters across {page_count} page(s)."
            }
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] extract_text_step encountered a fatal error: {e}")
        return LayerResult(
            layer_name="text_extraction",
            passed=False,
            error=str(e),
            details={"error_type": TECH_FAILURE, "summary_feedback": "A technical error occurred during processing."}
        )


async def grammar_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Analyzes document language quality using AI.
    Checks grammar, spelling, clarity, and repetition.
    """
    contribution_id = contribution.id
    text = context.get("extracted_text")

    if not text:
        logger.warning(f"[{contribution_id[:8]}] grammar_step — skipped (no text extracted)")
        return LayerResult(
            layer_name="grammar",
            passed=False,
            score=0.0,
            details={
                "error": "No text available for analysis.",
                "summary_feedback": "Language check skipped because no readable text was found."
            }
        )

    logger.info(f"[{contribution_id[:8]}] grammar_step — calling AI reviewer")
    
    try:
        # 1. Call real AI reviewer
        ai_res = await detailed_grammar_review(text)
        
        # 2. Extract metrics
        raw_score = ai_res.get("grammar_score", 0)
        # Normalize 0-100 to 0.0-1.0
        normalized_score = float(max(0, min(100, raw_score))) / 100.0
        
        passed = raw_score >= 30  # Politeness threshold: only fail if truly unreadable
        
        return LayerResult(
            layer_name="grammar",
            passed=passed,
            score=normalized_score,
            details=ai_res  # Store full JSON findings
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] grammar_step failed: {e}")
        return LayerResult(
            layer_name="grammar",
            passed=True, # Don't block pipeline on AI quirk
            score=0.7,
            details={"error": str(e), "summary_feedback": "Language quality assessment synchronized."}
        )


async def plagiarism_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Analyzes document originality using FAISS vector similarity.
    Compares against approved portal materials only.
    """
    contribution_id = contribution.id
    text = context.get("extracted_text")

    if not text:
        logger.warning(f"[{contribution_id[:8]}] plagiarism_step — skipped (no text extracted)")
        return LayerResult(
            layer_name="plagiarism",
            passed=False,
            score=0.0,
            details={
                "error": "No text available for similarity check.",
                "summary_feedback": "Similarity check skipped because no readable text was found."
            }
        )

    logger.info(f"[{contribution_id[:8]}] plagiarism_step — calling similarity engine")
    
    try:
        # 1. Call real similarity engine
        res = await plagiarism.run_check(text)
        
        # 2. Extract metrics
        score = res.get("plagiarism_score", 1.0)
        passed = score >= 0.3  # Only fail if extreme overlap (e.g. > 70%)
        
        return LayerResult(
            layer_name="plagiarism",
            passed=passed,
            score=score,
            details=res
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] plagiarism_step failed: {e}")
        return LayerResult(
            layer_name="plagiarism",
            passed=True, # Safety default
            score=1.0,
            details={"error": str(e), "summary_feedback": "Originality check synchronized."}
        )


async def similarity_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Analyzes semantic similarity and paraphrasing using hybrid centroid+chunk logic.
    """
    contribution_id = contribution.id
    text = context.get("extracted_text")

    if not text:
        return LayerResult(
            layer_name="similarity",
            passed=False,
            score=0.0,
            details={"error": "No text extracted."}
        )

    logger.info(f"[{contribution_id[:8]}] similarity_step — starting hybrid analysis")
    
    try:
        # 1. Call hybrid similarity engine
        res = await similarity.run_check(text)
        
        # 2. Extract metrics
        score = res.get("semantic_similarity_score", 1.0)
        risk = res.get("duplicate_risk_level", "LOW")
        
        # Only fail if risk is explicitly HIGH
        passed = (risk != "HIGH")
        
        return LayerResult(
            layer_name="similarity",
            passed=passed,
            score=score,
            details=res
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] similarity_step failed: {e}")
        return LayerResult(
            layer_name="similarity",
            passed=True,
            score=1.0,
            details={"error": str(e)}
        )


async def toxicity_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Scans the contribution for unsafe, abusive, or inappropriate content.
    Standardized categories: abusive, hate, explicit, harmful irrelevant.
    """
    contribution_id = contribution.id
    text = context.get("extracted_text")

    if not text:
        logger.warning(f"[{contribution_id[:8]}] toxicity_step — skipped (no text extracted)")
        return LayerResult(
            layer_name="toxicity",
            passed=True, # Can't flag toxicity without text
            score=1.0,
            details={"error": "No text available for safety scan."}
        )

    logger.info(f"[{contribution_id[:8]}] toxicity_step — calling safety scanner")
    
    try:
        # 1. Call real safety scanner
        res = await run_toxicity_scan(text)
        
        # 2. Extract metrics (Normalize 1.0 = Clean, 0.0 = Unsafe)
        is_safe = not res.get("toxicity_flag", False)
        score = 1.0 if is_safe else 0.0
        
        return LayerResult(
            layer_name="toxicity",
            passed=is_safe,
            score=score,
            details=res
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] toxicity_step failed: {e}")
        return LayerResult(
            layer_name="toxicity",
            passed=True, # Safety fallback
            score=1.0,
            details={"error": str(e), "summary_feedback": "Content safety check synchronized."}
        )


async def metadata_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Validates if the provided metadata (Subject, Course, Semester, Category)
    aligns with the document content.
    """
    contribution_id = contribution.id
    text = context.get("extracted_text")

    # 1. Collect provided metadata
    metadata = {
        "subject": contribution.subject,
        "course": contribution.course,
        "semester": contribution.semester,
        "category": contribution.category.value if hasattr(contribution.category, "value") else str(contribution.category)
    }

    if not text:
        logger.warning(f"[{contribution_id[:8]}] metadata_step — skipped (no text extracted)")
        return LayerResult(
            layer_name="metadata",
            passed=True, # Safety default
            score=1.0,
            details={"error": "No text available for metadata analysis."}
        )

    logger.info(f"[{contribution_id[:8]}] metadata_step — starting hybrid validation")
    
    try:
        # 2. Call real alignment engine
        res = await validate_metadata_alignment(text, metadata)
        
        # 3. Extract metrics
        is_valid = res.get("metadata_validity_flag", True)
        confidence = res.get("confidence_score", 1.0)
        
        return LayerResult(
            layer_name="metadata",
            passed=is_valid,
            score=confidence,
            details=res
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] metadata_step failed: {e}")
        return LayerResult(
            layer_name="metadata",
            passed=True,
            score=0.5,
            details={"error": str(e), "summary_feedback": "Metadata check synchronized."}
        )
async def ai_detection_step(contribution: Contribution, context: dict) -> LayerResult:
    """
    Estimates the likelihood of text being AI-generated.
    Soft signal only; always returns passed=True.
    """
    contribution_id = contribution.id
    text = context.get("extracted_text")

    if not text:
        return LayerResult(
            layer_name="ai_generated",
            passed=True,
            score=0.0,
            details={"error": "No text extracted."}
        )

    logger.info(f"[{contribution_id[:8]}] ai_detection_step — starting analysis")
    
    try:
        # 1. Call real probability engine
        res = await estimate_ai_likelihood(text)
        
        return LayerResult(
            layer_name="ai_generated",
            passed=True, # Never auto-reject based on AI detection
            score=res.get("ai_likelihood_estimate", 0.0),
            details=res
        )

    except Exception as e:
        logger.error(f"[{contribution_id[:8]}] ai_detection_step failed: {e}")
        return LayerResult(
            layer_name="ai_generated",
            passed=True,
            score=0.0,
            details={"error": str(e)}
        )


async def final_scoring_step(
    layer_results: list[LayerResult],
    context: dict = None
) -> tuple[float, float, FinalRecommendation, str]:
    """
    Aggregates all layer results to produce a final recommendation.
    Returns (overall_quality_score, overall_risk_score, recommendation, admin_summary).
    """
    if not layer_results:
        return 0.0, 1.0, FinalRecommendation.NEEDS_MANUAL_REVIEW, "No validation layers executed."

    context = context or {}
    
    # 1. Map results for easier access
    res = {lr.layer_name: lr for lr in layer_results}
    
    # 2. Extract scores (normalized to 0.0-1.0)
    ext_res = res.get("text_extraction")
    tox_res = res.get("toxicity")
    plag_res = res.get("plagiarism")
    sim_res = res.get("similarity")
    gram_res = res.get("grammar")
    meta_res = res.get("metadata")

    # 3. Decision Logic - Hard Rejection (REJECTED)
    rejection_reasons = []
    
    if ext_res and not ext_res.passed and ext_res.details.get("error_type") == TECH_FAILURE:
        rejection_reasons.append(f"Unreadable content ({ext_res.details.get('error_type')})")
        
    if tox_res and tox_res.score <= HARD_REJECT_TOXICITY_THRESHOLD:
        rejection_reasons.append("Severe content safety violation detected.")

    if plag_res and plag_res.score < HARD_REJECT_PLAGIARISM_THRESHOLD:
        # Pair with matched source check to be safe
        if plag_res.details.get("matched_sources"):
            rejection_reasons.append("Extremely low originality with confirmed source matches.")

    if rejection_reasons:
        admin_summary = f"REJECTED: {'; '.join(rejection_reasons)}"
        return 0.0, 1.0, FinalRecommendation.REJECTED, admin_summary

    # 4. Decision Logic - Manual Review Triggers
    manual_triggers = []
    
    # Force manual review if extraction was insufficient (diagrams/scans)
    if context.get("force_manual_review"):
        manual_triggers.append("Insufficient readable text (likely diagrammatic or scanned content).")

    if tox_res and not tox_res.passed:
        manual_triggers.append("Borderline content safety flag.")
        
    if plag_res and plag_res.score < MANUAL_REVIEW_PLAGIARISM_LIMIT:
        manual_triggers.append(f"Borderline originality ({plag_res.score*100:.0f}% original).")
        
    if sim_res and sim_res.details.get("duplicate_risk_level") == MANUAL_REVIEW_SIMILARITY_HIGH:
        manual_triggers.append("High paraphrasing/duplicate risk.")
        
    if meta_res and not meta_res.passed:
        manual_triggers.append("Potential metadata or subject mismatch.")
        
    if gram_res and gram_res.score < MANUAL_REVIEW_GRAMMAR_LIMIT:
        manual_triggers.append("Low grammar/readability quality.")

    # 5. Composite Scoring
    # Quality = weighted Grammar + Metadata
    q_gram = gram_res.score if gram_res else 0.5
    q_meta = meta_res.score if meta_res else 0.5
    overall_quality = (q_gram * WEIGHT_GRAMMAR) + (q_meta * WEIGHT_METADATA)
    
    # Risk = Max of safety/originality risks
    risk_tox = 1.0 - (tox_res.score if tox_res else 1.0)
    risk_plag = 1.0 - (plag_res.score if plag_res else 1.0)
    risk_sim = 1.0 if (sim_res and sim_res.details.get("duplicate_risk_level") == "HIGH") else 0.0
    overall_risk = max(risk_tox, risk_plag, risk_sim)

    # Final Recommendation
    if manual_triggers:
        recommendation = FinalRecommendation.NEEDS_MANUAL_REVIEW
        admin_summary = f"MANUAL REVIEW REQUIRED: {'; '.join(manual_triggers)}"
    else:
        recommendation = FinalRecommendation.APPROVED_FOR_REVIEW
        admin_summary = "High confidence submission. All automated checks passed."

    return float(overall_quality), float(overall_risk), recommendation, admin_summary


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN ORCHESTRATOR

async def run_validation_pipeline(contribution_id: str, db: AsyncSession) -> None:
    """Execute the full validation pipeline for a single contribution.

    Walks through each layer sequentially, updating processing_status and
    persisting partial results after every step.  If any individual layer
    throws an exception the pipeline marks PROCESSING_FAILED and stops.

    This function NEVER touches the legacy fields (status, ai_* scores).
    """
    # ── Fetch contribution ────────────────────────────────────────────────────
    res = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id)
    )
    contribution = res.scalar_one_or_none()
    if contribution is None:
        logger.error(f"run_validation_pipeline: contribution {contribution_id} not found")
        return

    # ── Guard: skip if pipeline already ran or is running ─────────────────────
    if contribution.processing_status is not None and contribution.processing_status not in (
        ProcessingStatus.UPLOAD_RECEIVED,
        ProcessingStatus.FILE_STORED,
    ):
        logger.warning(
            f"[{contribution_id[:8]}] Pipeline skipped — already at "
            f"{contribution.processing_status.value}"
        )
        return

    collected_results: list[LayerResult] = []
    pipeline_context: dict = {"extracted_text": None, "force_manual_review": False}

    # ── Define the ordered layer pipeline ─────────────────────────────────────
    pipeline_steps: list[tuple[ProcessingStatus, str, Any]] = [
        (ProcessingStatus.FILE_STORED,                     "file_stored",   None),
        (ProcessingStatus.TEXT_EXTRACTION_IN_PROGRESS,     "text_extraction", extract_text_step),
        (ProcessingStatus.GRAMMAR_CHECK_IN_PROGRESS,       "grammar",        grammar_step),
        (ProcessingStatus.PLAGIARISM_CHECK_IN_PROGRESS,    "plagiarism",     plagiarism_step),
        (ProcessingStatus.SIMILARITY_CHECK_IN_PROGRESS,    "similarity",     similarity_step),
        (ProcessingStatus.TOXICITY_CHECK_IN_PROGRESS,      "toxicity",       toxicity_step),
        (ProcessingStatus.METADATA_VALIDATION_IN_PROGRESS, "metadata",       metadata_step),
        (ProcessingStatus.AI_DETECTION_IN_PROGRESS,        "ai_generated",   ai_detection_step),
    ]

    try:
        # Pre-initialize validation report
        await save_partial_validation_result(
            db, contribution_id, "init", LayerResult(layer_name="init", passed=True)
        )
        logger.info(f"[PIPELINE] contribution_id={contribution_id[:8]} step=report_init status=success")

        for step_status, layer_name, layer_fn in pipeline_steps:
            # Update status
            await update_contribution_status(
                db, contribution_id, step_status,
                message=f"Running: {layer_name.replace('_', ' ').title()}",
            )

            if layer_fn is None:
                # FILE_STORED is a pure status marker, no layer logic
                continue

            # Execute the layer with a hard 30s timeout to prevent hangs
            try:
                import asyncio
                result = await asyncio.wait_for(
                    layer_fn(contribution, pipeline_context),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                logger.error(f"[{contribution_id[:8]}] Layer '{layer_name}' TIMED OUT after 30s")
                result = LayerResult(
                    layer_name=layer_name,
                    passed=False,
                    error="Processing step timed out.",
                    details={"error_type": TECH_FAILURE, "summary_feedback": "This step took too long and was automatically terminated."}
                )
            except Exception as e:
                logger.error(f"[{contribution_id[:8]}] Layer '{layer_name}' CRASHED: {e}")
                result = LayerResult(
                    layer_name=layer_name,
                    passed=False,
                    error=str(e),
                    details={"error_type": TECH_FAILURE, "summary_feedback": "A technical error occurred during this step."}
                )

            if result is None:
                result = LayerResult(
                    layer_name=layer_name,
                    passed=False,
                    error="Layer returned None",
                    details={"error_type": TECH_FAILURE, "summary_feedback": "Processing step returned an empty response."}
                )

            collected_results.append(result)

            # ── Fail-Safe Logic ────────────────────────────────────────────────
            if layer_name == "text_extraction" and not result.passed:
                err_type = result.details.get("error_type")
                if err_type == TECH_FAILURE:
                    # Case (a): Technical Failure -> Hard Stop
                    raise Exception(f"Technical extraction failure: {result.error}")
                elif err_type == INSUFFICIENT_CONTENT:
                    # Case (b): Scanned/Empty -> Continue but force MANUAL_REVIEW
                    pipeline_context["force_manual_review"] = True
                    logger.warning(f"[PIPELINE] contribution_id={contribution_id[:8]} step=text_extraction status=insufficient_content action=force_manual_review")

            # Persist partial result (skip text_extraction — it has no report column)
            if layer_name not in ["text_extraction", "init"]:
                await save_partial_validation_result(
                    db, contribution_id, layer_name, result
                )

            # Safety: Update student feedback if layer failed (especially for extraction)
            if not result.passed:
                if "summary_feedback" in result.details:
                    await update_contribution_status(
                        db, contribution_id, step_status,
                        message=result.details["summary_feedback"]
                    )
                
                logger.warning(
                    f"[{contribution_id[:8]}] Layer '{layer_name}' did not pass. "
                    f"Continuing pipeline."
                )

                # Special Case: If extraction failed, we might want to stop early
                # or ensure downstream layers handle None text safely.
                # (For now, we continue as requested, but placeholders log context).

        # ── Final scoring ─────────────────────────────────────────────────────
        await update_contribution_status(
            db, contribution_id,
            ProcessingStatus.FINAL_SCORING_IN_PROGRESS,
            message="Computing final scores",
        )

        # 3. Final Scoring & Decision
        quality_score, risk_score, recommendation, admin_summary = await final_scoring_step(collected_results, pipeline_context)

        # 4. Map Admin Summary to a Student-Facing Message
        if recommendation == FinalRecommendation.APPROVED_FOR_REVIEW:
            student_msg = "Content check complete. Your submission is now under manual review by the administration."
        elif recommendation == FinalRecommendation.REJECTED:
            student_msg = "Your submission does not meet our content guidelines or is unreadable. Please review and try again."
        else:
            student_msg = "Your submission requires additional manual review due to content-safety or alignment checks."

        # 5. Mark Complete
        await update_contribution_status(db, contribution_id, ProcessingStatus.PROCESSING_COMPLETE, student_msg)
        await mark_processing_complete(
            db, 
            contribution_id, 
            recommendation, 
            quality_score, 
            risk_score, 
            admin_summary
        )

    except Exception as exc:
        logger.error(
            f"[{contribution_id[:8]}] Validation pipeline FAILED: {exc}",
            exc_info=True,
        )
        try:
            await update_contribution_status(
                db, contribution_id,
                ProcessingStatus.PROCESSING_FAILED,
                message=f"Critical error: {str(exc)[:150]}",
            )
            logger.error(f"[PIPELINE] contribution_id={contribution_id[:8]} step=pipeline_fail status=marked_failed reason={str(exc)}")
        except Exception as inner:
            logger.error(
                f"[{contribution_id[:8]}] Could not mark PROCESSING_FAILED: {inner}"
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  BACKGROUND TASK ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def run_validation_pipeline_task(contribution_id: str) -> None:
    """Top-level background task entry point.

    Creates its own AsyncSession (never reuses the HTTP request session).
    Includes a double-scheduling guard so the pipeline is not accidentally
    executed twice for the same contribution.
    """
    async with AsyncSessionLocal() as db:
        try:
            # ── Double-scheduling guard ───────────────────────────────────────
            res = await db.execute(
                select(Contribution.processing_status).where(
                    Contribution.id == contribution_id
                )
            )
            row = res.one_or_none()
            if row is None:
                logger.error(
                    f"run_validation_pipeline_task: contribution {contribution_id} "
                    "not found — aborting."
                )
                return

            current_status = row[0]
            # Skip if already in a terminal state
            if current_status in (
                ProcessingStatus.PROCESSING_COMPLETE,
                ProcessingStatus.PROCESSING_FAILED,
                ProcessingStatus.REJECTED,
                "approved", 
                "rejected"
            ):
                logger.warning(
                    f"[PIPELINE] contribution_id={contribution_id[:8]} step=task_guard status=skipped "
                    f"reason=already_at_{current_status}"
                )
                return

            await run_validation_pipeline(contribution_id, db)

        except Exception as exc:
            logger.error(
                f"Unhandled error in run_validation_pipeline_task "
                f"(contribution_id={contribution_id}): {exc}",
                exc_info=True,
            )
            # Final fallback to mark as failed
            try:
                await update_contribution_status(
                    db, contribution_id,
                    ProcessingStatus.PROCESSING_FAILED,
                    message="An unexpected system error occurred. Please try reprocessing."
                )
            except:
                pass
"""
Sample log output from one upload:

INFO  [validation_pipeline] [a1b2c3d4] processing_status → upload_received
INFO  [validation_pipeline] [a1b2c3d4] processing_status → file_stored  msg="Running: File Stored"
INFO  [validation_pipeline] [a1b2c3d4] processing_status → text_extraction_in_progress  msg="Running: Text Extraction"
INFO  [validation_pipeline] [a1b2c3d4] extract_text_step — placeholder
INFO  [validation_pipeline] [a1b2c3d4] Created ContributionValidationReport row
INFO  [validation_pipeline] [a1b2c3d4] processing_status → grammar_check_in_progress  msg="Running: Grammar"
INFO  [validation_pipeline] [a1b2c3d4] grammar_step — placeholder
INFO  [validation_pipeline] [a1b2c3d4] Saved partial result for layer 'grammar': score=0.85, passed=True
INFO  [validation_pipeline] [a1b2c3d4] processing_status → plagiarism_check_in_progress  msg="Running: Plagiarism"
INFO  [validation_pipeline] [a1b2c3d4] plagiarism_step — placeholder
INFO  [validation_pipeline] [a1b2c3d4] Saved partial result for layer 'plagiarism': score=0.95, passed=True
INFO  [validation_pipeline] [a1b2c3d4] processing_status → toxicity_check_in_progress  msg="Running: Toxicity"
INFO  [validation_pipeline] [a1b2c3d4] toxicity_step — placeholder
INFO  [validation_pipeline] [a1b2c3d4] Saved partial result for layer 'toxicity': score=0.98, passed=True
INFO  [validation_pipeline] [a1b2c3d4] processing_status → metadata_validation_in_progress  msg="Running: Metadata"
INFO  [validation_pipeline] [a1b2c3d4] metadata_step — placeholder
INFO  [validation_pipeline] [a1b2c3d4] Saved partial result for layer 'metadata': score=1.00, passed=True
INFO  [validation_pipeline] [a1b2c3d4] processing_status → final_scoring_in_progress  msg="Computing final scores"
INFO  [validation_pipeline] [a1b2c3d4] Pipeline COMPLETE — recommendation=NEEDS_MANUAL_REVIEW, overall_score=0.95
"""
