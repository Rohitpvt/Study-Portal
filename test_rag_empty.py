import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.ai.rag import retrieve

async def test_empty_rag():
    try:
        # Simulate a query on an empty RAG
        result = await retrieve("Hello, what is machine learning?", top_k=3)
        print("RAG Query Result:", result)
        print("SUCCESS: RAG handles empty index without crashing.")
    except Exception as e:
        print("CRASH: RAG threw an error on empty index!")
        print(str(e))

if __name__ == "__main__":
    asyncio.run(test_empty_rag())
