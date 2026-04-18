import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.ai import rag

async def verify_meta():
    rag.load_index()
    mat_id = "29a001bc-c219-4679-8857-9bd8d907a646"
    all_docs = list(rag._index_docs.values())
    target_docs = [d for d in all_docs if d.get("material_id") == mat_id]
    if target_docs:
        doc = target_docs[0]
        print(f"MATERIAL_ID: {doc.get('material_id')}")
        print(f"TITLE: {doc.get('title')}")
        print(f"CATEGORY: {doc.get('category')}")
        print(f"HAS_CATEGORY: {'category' in doc}")
    else:
        print("No docs found for material_id")

if __name__ == "__main__":
    asyncio.run(verify_meta())
