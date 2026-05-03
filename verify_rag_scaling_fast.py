import asyncio
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ai import rag

async def verify_rag():
    print("--- FAST RAG SCALING VERIFICATION ---")
    
    # 1. Check if index is loaded
    if not rag.is_ready():
        print("Index not ready. Loading...")
        rag.load_index()
    
    # 2. Test Queries
    queries = [
        "What are the key pillars of digital marketing strategy?",
        "Explain the concepts of bias and transparency in AI Ethics.",
        "What is the java.util.concurrent package used for?",
        "How does the OSI model relate to IoT protocols?",
        "What are smart contracts in the context of blockchain?",
        "Explain the difference between Stateless and Stateful widgets in Flutter.",
        "What is the CAP Theorem in distributed databases?",
        "How does ray tracing achieve realism in computer graphics?",
        "What are the main components of a game engine?",
        "Explain the difference between Microeconomics and Macroeconomics.",
        "What is the purpose of the Page Object Model in Selenium?",
        "How do Transformer models use attention mechanisms in NLP?",
        "What is the foundation of distributed data processing in Hadoop?",
        "Explain the role of qubits in quantum computing.",
        "What are the common filtering techniques in image processing?"
    ]
    
    success_count = 0
    for q in queries:
        # We use a lower threshold here to see what the BEST match is even if it would be discarded by the chatbot
        context, sources, min_dist = await rag.retrieve(q, top_k=3)
        
        source_titles = [s["title"] for s in sources]
        print(f"Q: {q}")
        print(f"  Best Match: {source_titles[0] if source_titles else 'None'}")
        print(f"  Min Distance: {min_dist:.4f}")
        print(f"  Hits: {len(sources)}")
        
        # Heuristic for success in this test: min_dist < 1.45 (allowing for synthetic short content)
        if min_dist < 1.45 and len(sources) > 0:
            success_count += 1
            print("  ✓ Grounded")
        else:
            print("  ✗ Weak Grounding")
            
    print(f"\n--- RAG Scaling Result: {success_count}/{len(queries)} grounded ---")

if __name__ == "__main__":
    asyncio.run(verify_rag())
