import os
import sys
import uuid
import asyncio
import logging

# Add project root to path
sys.path.append(os.getcwd())

# Mock environment setup
os.environ["NVIDIA_API_KEY"] = "mock-key"

from app.services import chatbot_service
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.models.material import Material
from app.ai import rag
from sqlalchemy import select

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_filters")

async def run_test():
    async with AsyncSessionLocal() as db:
        # 1. Initialize RAG with mock metadata for deterministic testing
        print("\n--- Initializing RAG Index with Mock Metadata ---")
        mock_docs = [
            {
                "material_id": "m1", 
                "title": "Computer Science 101", 
                "chunk": "Introduction to computer science and networking fundamentals.",
                "course": "BCA", 
                "subject": "Computer Science", 
                "semester": 6
            },
            {
                "material_id": "m2", 
                "title": "DBMS Advanced", 
                "chunk": "Mastering SQL queries and relational database design.",
                "course": "BCA", 
                "subject": "DBMS", 
                "semester": 4
            }
        ]
        
        import numpy as np
        import faiss
        vectors = []
        for d in mock_docs:
            vectors.append(await rag.embed(d["chunk"]))
        
        rag._faiss_index = faiss.IndexFlatL2(rag.EMBEDDING_DIM)
        rag._faiss_index.add(np.array(vectors, dtype="float32"))
        rag._index_docs = mock_docs
        rag._index_built = True
        
        print(f"DEBUG: Index built with {len(mock_docs)} mock chunks.")
        
        # 2. Test 1: No Filters (Should return results)
        print("\n[TEST 1] No Filters")
        context_1, _ = await rag.retrieve("networking", top_k=3)
        print(f"Results without filters: {len(context_1.split('---'))} chunk(s) found.")
        
        # 3. Test 2: Correct Subject Filter ('Computer Science')
        print("\n[TEST 2] Subject Filter: Computer Science")
        context_2, _ = await rag.retrieve("syllabus", subject="Computer Science", top_k=3)
        if context_2 and "Computer Science" in context_2:
            print("SUCCESS: Found Computer Science results.")
        else:
            print("FAILED: Computer Science results missing or filtered incorrectly.")

        # 4. Test 3: Semester Filter (6)
        print("\n[TEST 3] Semester Filter: 6")
        context_3, _ = await rag.retrieve("notes", semester=6, top_k=3)
        if context_3:
             print(f"SUCCESS: Found results for Semester 6.")
        else:
             print("FAILED: Semester 6 results missing.")

        # 5. Test 4: Mismatched Filter (Subject: Biology - NON-EXISTENT)
        print("\n[TEST 4] Mismatched Filter (Subject: Biology)")
        context_4, _ = await rag.retrieve("Computing", subject="Biology", top_k=3)
        if not context_4:
            print("SUCCESS: Gracefully returned empty context for non-matching filter.")
        else:
            print("FAILED: Should have returned empty context for Biology.")

        # 6. Test 5: Chatbot Service Integration (Using existing user)
        print("\n[TEST 5] Chatbot Service Integration")
        session_id = str(uuid.uuid4())
        try:
            # Using the ID found in DB query
            valid_user_id = "7296060c-9167-45c0-95ba-77b079863378"
            
            response = await chatbot_service.ask(
                query="What is in the CS syllabus?",
                user_id=valid_user_id,
                session_id=session_id,
                db=db,
                subject="Computer Science"
            )
            print(f"Chatbot Response status: {len(response.answer) > 0}")
            if "m1" in response.sources:
                print("SUCCESS: RAG context correctly limited by filters.")
        except Exception as e:
            print(f"Chatbot integration error: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())
