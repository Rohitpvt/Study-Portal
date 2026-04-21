import asyncio
from app.ai.reviewer import detailed_grammar_review
import sys

# Setting up event loop for Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test_reviewer():
    test_text = "This be extremely bad academics documents. I am writing this sentence with terrible grammatical structure and many error."
    print("Testing detailed_grammar_review with badly written text...")
    
    result = await detailed_grammar_review(test_text)
    
    print("\n--- AI Review Result ---")
    print(f"Grammar Score: {result.get('grammar_score')}/100")
    print(f"Readability Score: {result.get('readability_score')}/100")
    print(f"Issue Count: {result.get('issue_count')}")
    print(f"Summary Feedback: {result.get('summary_feedback')}")
    print(f"Detailed Findings: {result.get('detailed_findings')}")
    
    # Assert it actually caught errors (meaning it didn't use the fallback 80/100 score)
    if result.get('grammar_score', 100) < 60:
        print("\n✅ SUCCESS: AI correctly identified bad grammar! The async pipeline is fully restored.")
    else:
        print("\n❌ FAILED: AI gave a very high score to terrible text. It might still be hitting the fallback block.")

if __name__ == "__main__":
    asyncio.run(test_reviewer())
