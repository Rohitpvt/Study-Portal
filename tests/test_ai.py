"""
tests/test_ai.py
─────────────────
Unit tests for the modular AI components.
"""

import pytest
from app.ai.plagiarism import run_check
from app.ai.reviewer import gpt_review


@pytest.mark.asyncio
async def test_plagiarism_check_mock(db_session):
    """Verify the FAISS substitution mock plagiarism logic returns bounds."""
    score = await run_check("Some sample text for the test.", db_session)
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


@pytest.mark.asyncio
async def test_gpt_review_mock():
    """Verify the offline model structure generates required LLM dictionaries."""
    result = await gpt_review("This is a mock check for grammar.")
    
    assert "grammar_score" in result
    assert "quality_score" in result
    assert "feedback" in result
    assert isinstance(result["grammar_score"], int)
    assert isinstance(result["quality_score"], int)
    assert isinstance(result["feedback"], str)
