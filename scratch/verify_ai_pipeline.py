import asyncio
import logging
from app.ai import reviewer, plagiarism
from app.core.config import settings

# Setup logging to see what's happening
logging.basicConfig(level=logging.INFO)

async def verify_ai_models():
    print("--- AI CONTENT CHECKER VERIFICATION ---")
    
    test_text = """
    Artificial Intelligence (AI) is a branch of computer science that aims to create machines capable of intelligent behavior.
    In recent years, deep learning has revolutionized the field, enabling breakthroughs in image recognition, 
    natural language processing, and autonomous systems. This document provides a comprehensive overview of 
    neural networks and their applications in modern industry.
    """
    
    # 1. Grammar & Quality Review
    print("\n[1] Testing Detailed Grammar Review...")
    try:
        grammar_res = await reviewer.detailed_grammar_review(test_text)
        print(f"Success: Score={grammar_res.get('grammar_score')}, Feedback='{grammar_res.get('summary_feedback')}'")
    except Exception as e:
        print(f"Failed: {e}")

    # 2. Toxicity Scan
    print("\n[2] Testing Toxicity Scan...")
    try:
        toxic_res = await reviewer.run_toxicity_scan(test_text)
        print(f"Success: Flag={toxic_res.get('toxicity_flag')}, Categories={toxic_res.get('categories_triggered')}")
    except Exception as e:
        print(f"Failed: {e}")

    # 3. Metadata Alignment
    print("\n[3] Testing Metadata Alignment...")
    metadata = {
        "subject": "Artificial Intelligence",
        "course": "BCA",
        "category": "NOTES",
        "semester": 5
    }
    try:
        meta_res = await reviewer.validate_metadata_alignment(test_text, metadata)
        print(f"Success: Valid={meta_res.get('metadata_validity_flag')}, Confidence={meta_res.get('confidence_score')}")
    except Exception as e:
        print(f"Failed: {e}")

    # 4. AI Likelihood Estimation
    print("\n[4] Testing AI Likelihood Estimation...")
    try:
        ai_res = await reviewer.estimate_ai_likelihood(test_text)
        print(f"Success: Estimate={ai_res.get('ai_likelihood_estimate')}, Confidence={ai_res.get('confidence_level')}")
    except Exception as e:
        print(f"Failed: {e}")

    # 5. Plagiarism Check (Requires FAISS index to be loaded)
    print("\n[5] Testing Plagiarism Check (Internal Similarity)...")
    try:
        from app.ai import rag
        if not rag.is_ready():
            rag.load_index()
        
        # We'll just test the similarity logic if index is available
        if rag.is_ready():
            # Test with a snippet that might be in the index
            plag_res = await plagiarism.run_check(test_text)
            print(f"Success: Plagiarism Score={plag_res.get('plagiarism_score')}, Overlap={plag_res.get('overlap_percentage')}%")
        else:
            print("Skipping Plagiarism Check: FAISS index not ready.")
    except Exception as e:
        print(f"Failed: {e}")

    print("\n--- VERIFICATION COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(verify_ai_models())
