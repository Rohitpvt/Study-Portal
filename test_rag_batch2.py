"""Test RAG retrieval across all 15 materials with diverse queries."""
import asyncio, sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.ai import rag

async def test():
    rag.load_index()
    print(f"Index: {len(rag._index_docs)} chunks, {rag.is_ready()}\n")

    queries = [
        "What is normalization in databases?",
        "Explain page replacement algorithms in operating systems",
        "What is the OSI model in networking?",
        "How does merge sort work?",
        "What is Scrum in software engineering?",
        "Explain Bayes theorem in probability",
        "What are eigenvectors in linear algebra?",
        "How does A-star search work in AI?",
        "What is the DOM in web development?",
        "Explain symmetric encryption in cybersecurity",
        "What is serverless computing in cloud?",
        "What is the pigeonhole principle in discrete math?",
    ]
    
    results = []
    for q in queries:
        ctx, sources, dist = await rag.retrieve(q, top_k=2)
        src = sources[0]["title"] if sources else "NONE"
        results.append({"query":q,"source":src,"distance":round(dist,4),"ctx_len":len(ctx)})
        print(f"Q: {q}")
        print(f"  -> {src} (d={dist:.4f}, {len(ctx)} chars)")
    
    print(f"\nAll {len(results)} queries completed.")

if __name__ == "__main__":
    asyncio.run(test())
