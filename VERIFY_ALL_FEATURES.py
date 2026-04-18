import sqlite3
import os
import asyncio
from app.ai import rag
from app.services import chatbot_service
from app.core.database import AsyncSessionLocal

async def verify():
    print("--- 🔍 PLATFORM INTEGRITY CHECK ---")
    
    # 1. DB Audit
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    cursor.execute('SELECT title, is_approved FROM materials WHERE title = "ML Basics"')
    row = cursor.fetchone()
    if row:
        print(f"✅ DB: 'ML Basics' found and approved={row[1]}")
    else:
        print("❌ DB: 'ML Basics' missing!")
    conn.close()

    # 2. RAG Index Audit
    if rag.load_index():
        print(f"✅ RAG: Index loaded with {len(rag._index_docs)} chunks.")
    else:
        print("❌ RAG: Index failed to load.")

    # 3. Retrieval Test
    print("\n--- 🧠 RAG RETRIEVAL TEST ---")
    query = "What is machine learning?"
    context, sources = await rag.retrieve(query)
    if sources:
        print(f"✅ RAG RETRIEVAL: Found {len(sources)} sources.")
        for s in sources:
            print(f"   - {s.get('title')} (Page {s.get('page_number')})")
    else:
        print("❌ RAG RETRIEVAL: No sources found for 'machine learning'.")

    print("\n--- ✅ VERIFICATION COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(verify())
