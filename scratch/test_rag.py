
import asyncio
from app.ai import rag

async def test_rag(query: str):
    print(f"Testing Query: '{query}'")
    if not rag.load_index():
        print("Failed to load FAISS index from disk.")
        return
    context, sources, min_dist = await rag.retrieve(query)
    print(f"Min Distance: {min_dist}")
    print(f"Sources Found: {len(sources)}")
    if sources:
        print("First Source Title:", sources[0]['title'])
    else:
        print("No sources found.")

if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "What is data communication?"
    asyncio.run(test_rag(query))
