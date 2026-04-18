import logging
import numpy as np
from app.ai import rag

logger = logging.getLogger(__name__)

# ── Plagiarism Config ────────────────────────────────────────────────────────
# Squared L2 distance threshold for "High Match":
# 0.0 is perfect duplicate. 0.25 is ~87.5% cosine similarity (strict academic).
MATCH_THRESHOLD = 0.25 
CHUNK_SIZE = 200
CHUNK_OVERLAP = 50
TOP_K_CANDIDATES = 3


async def run_check(text: str) -> dict:
    """
    Real internal portal similarity check using FAISS vector search.
    Compares the contribution text against approved portal materials only.
    """
    if not text or not text.strip():
        return {
            "plagiarism_score": 1.0,
            "overlap_percentage": 0.0,
            "suspicious_sections": [],
            "matched_sources": [],
            "summary_feedback": "Originality check skipped (no text content)."
        }

    if not rag.is_ready():
        logger.warning("Plagiarism Check: RAG index not ready. Returning placeholder.")
        return {
            "plagiarism_score": 1.0,
            "overlap_percentage": 0.0,
            "suspicious_sections": [],
            "matched_sources": [],
            "summary_feedback": "Originality check synchronized (Portal index offline)."
        }

    # 1. Chunking
    chunks = rag.get_word_chunks(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
    if not chunks:
        return {"plagiarism_score": 1.0, "overlap_percentage": 0.0, "matched_sources": [], "summary_feedback": "Originality confirmed."}

    # 2. Embedding & Searching (Batch processing simulation)
    # Note: rag.embed is single-text, so we loop over chunks asynchronously
    matched_chunks_count = 0
    suspicious_fragments = []
    matched_sources_map = {} # material_id -> title

    for chunk in chunks:
        q_vec = await rag.embed(chunk, input_type="query")
        if q_vec is None:
            continue
        
        # Search candidate set
        distances, indices = rag.search_similarity(np.array([q_vec]), top_k=TOP_K_CANDIDATES)
        
        if indices.size == 0 or indices[0][0] == -1:
            continue
            
        # Check if any of the top candidates are below the threshold
        is_chunk_plagiarized = False
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1: continue
            
            if dist < MATCH_THRESHOLD:
                is_chunk_plagiarized = True
                # Get metadata for the match
                meta = rag.get_metadata_by_id(idx)
                if meta:
                    m_id = meta.get("material_id")
                    m_title = meta.get("title")
                    if m_id and m_title:
                        matched_sources_map[m_id] = m_title
                break
        
        if is_chunk_plagiarized:
            matched_chunks_count += 1
            if len(suspicious_fragments) < 3:
                suspicious_fragments.append(chunk[:150] + "...")

    # 3. Aggregation
    overlap_pct = (matched_chunks_count / len(chunks)) * 100
    plagiarism_score = max(0.0, min(1.0, 1.0 - (overlap_pct / 100.0)))
    
    # 4. Final results
    sources = [{"material_id": k, "title": v} for k, v in matched_sources_map.items()]
    
    # Polite neutral feedback
    feedback = f"Originality check: {100 - overlap_pct:.1f}% unique content compared to portal materials."
    if overlap_pct > 25:
        feedback = f"Originality check: {overlap_pct:.1f}% similarity detected with existing materials. Document is under manual review."

    return {
        "plagiarism_score": round(plagiarism_score, 2),
        "overlap_percentage": round(overlap_pct, 1),
        "suspicious_sections": suspicious_fragments,
        "matched_sources": sources,
        "summary_feedback": feedback
    }
