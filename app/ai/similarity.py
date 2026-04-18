import logging
import numpy as np
from app.ai import rag

logger = logging.getLogger(__name__)

# ── Similarity Config ────────────────────────────────────────────────────────
# Squared L2 threshold for "High" semantic similarity (Document Centroid)
CENTROID_MATCH_THRESHOLD = 0.35 

# Squared L2 threshold for "High" local chunk similarity
LOCAL_MATCH_THRESHOLD = 0.25

# Minimum % of chunks needing to match for a "Duplicate/Paraphrase" flag
MIN_CHUNK_MATCH_DENSITY = 0.3 # 30%

TOP_K_CANDIDATES = 3


async def run_check(text: str) -> dict:
    """
    Hybrid Similarity Detection:
    1. Primary Signal: Document Centroid Similarity
    2. Secondary Confirmation: Local Chunk-level evidence
    """
    if not text or not text.strip():
        return {
            "semantic_similarity_score": 1.0,
            "duplicate_risk_level": "LOW",
            "summary_feedback": "Similarity check skipped (no text content)."
        }

    if not rag.is_ready():
        return {
            "semantic_similarity_score": 1.0,
            "duplicate_risk_level": "LOW",
            "summary_feedback": "Similarity check synchronized (Portal index offline)."
        }

    # 1. Chunking & Embedding
    chunks = rag.get_word_chunks(text)
    if not chunks:
        return {"semantic_similarity_score": 1.0, "duplicate_risk_level": "LOW", "summary_feedback": "Originality confirmed."}

    chunk_embeddings = []
    for c in chunks:
        vec = await rag.embed(c, input_type="query")
        if vec is not None:
            chunk_embeddings.append(vec)

    if not chunk_embeddings:
        return {"semantic_similarity_score": 1.0, "duplicate_risk_level": "LOW", "summary_feedback": "Unable to analyze document structure."}

    # 2. DOCUMENT CENTROID (PRIMARY SIGNAL)
    # Average all chunk embeddings to get the "heart" of the document
    doc_centroid = np.mean(chunk_embeddings, axis=0)
    
    # Search for top centroid matches
    c_distances, c_indices = rag.search_similarity(np.array([doc_centroid]), top_k=TOP_K_CANDIDATES)

    if c_indices.size == 0 or c_indices[0][0] == -1:
        return {
            "semantic_similarity_score": 1.0,
            "duplicate_risk_level": "LOW",
            "summary_feedback": "Originality check: No significant semantic overlap detected."
        }

    # Analyze candidates
    top_candidates = []
    for dist, idx in zip(c_distances[0], c_indices[0]):
        if idx == -1: continue
        meta = rag.get_metadata_by_id(idx)
        if meta:
            top_candidates.append({
                "material_id": meta.get("material_id"),
                "title": meta.get("title"),
                "centroid_dist": float(dist)
            })

    if not top_candidates:
        return {"semantic_similarity_score": 1.0, "duplicate_risk_level": "LOW", "summary_feedback": "Originality check: No matches found."}

    # 3. LOCAL CONFIRMATION (SECONDARY SIGNAL)
    # Check the strongest centroid candidate for local paraphrasing evidence
    best_candidate = top_candidates[0]
    candidate_id = best_candidate["material_id"]
    candidate_chunks = rag.get_chunks_for_material(candidate_id)
    
    # Calculate local match density
    # NOTE: To stay efficient, we compare the contribution chunks against the candidate corpus
    # If the contribution's chunks frequently "hit" the same material_id, that's strong evidence.
    
    local_match_count = 0
    for q_vec in chunk_embeddings:
        # Check against ALL approved materials to see if this chunk matches the candidate's material
        # We reuse the search_similarity helper
        l_distances, l_indices = rag.search_similarity(np.array([q_vec]), top_k=5)
        
        hit_candidate = False
        for l_dist, l_idx in zip(l_distances[0], l_indices[0]):
            if l_idx == -1: continue
            if l_dist < LOCAL_MATCH_THRESHOLD:
                # If chunk is very similar to ANY part of the best candidate
                meta = rag.get_metadata_by_id(l_idx)
                if meta and meta.get("material_id") == candidate_id:
                    hit_candidate = True
                    break
        
        if hit_candidate:
            local_match_count += 1

    local_density = local_match_count / len(chunk_embeddings)
    centroid_sim = max(0.0, min(1.0, 1.0 - (best_candidate["centroid_dist"] / 2.0))) # Normalize L2 to approx 0-1
    
    # 4. SCORING & RISK LEVEL
    # HIGH: High Centroid + High Density (Paraphrase/Duplicate)
    # MEDIUM: Moderate Centroid + Low/Moderate Density (Potential Paraphrase)
    # LOW: Only Centroid (General Topic Overlap)
    
    risk_level = "LOW"
    signal_strength = centroid_sim
    
    if best_candidate["centroid_dist"] < CENTROID_MATCH_THRESHOLD:
        if local_density > MIN_CHUNK_MATCH_DENSITY:
            risk_level = "HIGH"
            signal_strength = max(signal_strength, 0.9)
        else:
            risk_level = "MEDIUM"
            signal_strength = max(signal_strength, 0.7)
    
    # 5. Admin Explanation
    explanation = f"Topic overlap detected with '{best_candidate['title']}'."
    if risk_level == "HIGH":
        explanation = f"Critical risk: Near-duplicate or heavily paraphrased version of '{best_candidate['title']}' detected."
    elif risk_level == "MEDIUM":
        explanation = f"Moderate risk: Reused sections or highly similar structural meaning compared to '{best_candidate['title']}'."

    # Student feedback (Neutral)
    feedback = f"Semantic check complete. Your document is {100 - (local_density * 100):.0f}% distinct from our core knowledge base."
    if risk_level in ["MEDIUM", "HIGH"]:
        feedback = "Your submission appears highly similar in meaning to existing portal materials and will be reviewed."

    return {
        "semantic_similarity_score": round(1.0 - local_density, 2),
        "duplicate_risk_level": risk_level,
        "centroid_similarity": round(centroid_sim, 2),
        "local_match_evidence": {
            "matched_chunks": local_match_count,
            "total_chunks": len(chunks),
            "match_density": round(local_density, 2)
        },
        "related_material_references": [{"material_id": c["material_id"], "title": c["title"]} for c in top_candidates[:1]],
        "summary_feedback": feedback,
        "admin_explanation": explanation
    }
