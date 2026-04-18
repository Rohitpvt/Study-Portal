import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.material import Material
from app.ai import rag

async def main():
    print("🚀 Starting full RAG reindexing with robust background fail-safes...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Clear the local index entirely
            rag.clear_index()
            print("✅ Existing FAISS index fully cleared.")
            
            # 2. Fetch all approved materials
            result = await db.execute(
                select(Material).where(Material.is_approved == True)  # noqa: E712
            )
            materials = result.scalars().all()
            
            if not materials:
                print("⚠️ No approved materials found. Process complete.")
                return
            
            print(f"📄 Found {len(materials)} approved materials to index.\n")
            
            succeeded = 0
            failed = []
            skipped = 0
            total_chunks = 0
            
            # 3. Process each document safely
            for material in materials:
                try:
                    print(f"🔄 Processing [{material.id}]: {material.title}...")
                    
                    # We can use index_one which handles single insertions.
                    # It natively cleans up old chunks, but we already cleared FAISS,
                    # so this just securely chunks & embeds.
                    success = await rag.index_one(material)
                    
                    if success:
                        succeeded += 1
                        print(f"   ✔️ Success.")
                    else:
                        skipped += 1
                        print(f"   ⏭️ Skipped (no vectors generated).")
                except Exception as e:
                    failed.append(material.id)
                    print(f"   ❌ FAILED: {e}")
            
            # Print Summary
            print("\n" + "="*40)
            print("📊 REINDEX SUMMARY")
            print("="*40)
            print(f"Total Attempted: {len(materials)}")
            print(f"Succeeded:       {succeeded}")
            print(f"Skipped:         {skipped}")
            print(f"Failed:          {len(failed)}")
            print("="*40)
            
            if failed:
                print("\n⚠️ Failed Material IDs:")
                for fid in failed:
                    print(f" - {fid}")
            
            print("\n✅ Full rebuild complete!")
            
        except Exception as e:
            print(f"❌ Critical Reindexing Failure: {e}")

if __name__ == "__main__":
    asyncio.run(main())
