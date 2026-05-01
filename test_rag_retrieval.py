"""Test RAG retrieval with real indexed content."""
import asyncio, sys, os, json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.ai import rag

async def test():
    # Load the index from disk first
    rag.load_index()
    print(f"Index ready: {rag.is_ready()}")
    print(f"Index has {len(rag._index_docs)} chunks\n")

    queries = [
        ("What is a binary search tree?", "Computer Science"),
        ("Explain the chain rule in calculus", "Mathematics"),
        ("What is Newton's second law?", "Physics"),
        ("What is momentum conservation?", "Physics"),
    ]
    
    for query_text, expected_subject in queries:
        context, sources, distance = await rag.retrieve(query_text, top_k=3)
        print(f"Query: {query_text}")
        print(f"  Distance: {distance:.4f}")
        print(f"  Sources: {[s['title'] for s in sources]}")
        print(f"  Context length: {len(context)} chars")
        if context:
            print(f"  Context preview: {context[:150]}...")
        else:
            print(f"  Context: EMPTY")
        print()

if __name__ == "__main__":
    asyncio.run(test())
