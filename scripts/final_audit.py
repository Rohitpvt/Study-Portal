import asyncio
import os
import sys
import logging
import httpx
from sqlalchemy import select

# Add project root to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.ai import rag
from app.services.key_manager import nvidia_key_manager
from app.services.llm_service import get_chat_response
from app.utils.file_handler import get_storage
from app.core.database import AsyncSessionLocal
from app.models.material import Material

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("final_audit")

async def test_key_rotation_logic():
    print("\n--- Testing NVIDIA Key Rotation logic ---")
    initial_key = nvidia_key_manager.get_current_key()
    initial_masked = nvidia_key_manager.get_masked_key()
    print(f"Initial Key: {initial_masked}")
    
    # Simulate a rotation
    nvidia_key_manager.rotate_key()
    rotated_masked = nvidia_key_manager.get_masked_key()
    print(f"Rotated Key: {rotated_masked}")
    
    if initial_masked != rotated_masked:
        print("SUCCESS: Key rotation mechanism functional.")
    else:
        print("WARNING: Key rotation did not change key (is there only 1 key?).")

async def test_s3_and_presigned_url():
    print("\n--- Testing S3 & Presigned URL Flow ---")
    storage = get_storage()
    if settings.STORAGE_BACKEND != "s3":
        print("Skipping S3 test (Local backend active).")
        return
        
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Material).limit(1))
            mat = result.scalars().first()
            if not mat:
                print("FAILURE: No materials found in DB to test S3.")
                return
            
            # Prefer file_key for S3
            test_key = mat.file_key if mat.file_key else mat.file_path
            print(f"Testing with material: {mat.title} (Key: {test_key})")
            
            url = storage.get_url(test_key)
            print(f"Generated URL: {url[:100]}...")
            
            # Test if URL is accessible (HEAD request)
            async with httpx.AsyncClient(verify=False) as client:
                resp = await client.head(url)
                if resp.status_code == 200:
                    print("SUCCESS: Presigned URL is valid and reachable.")
                else:
                    print(f"FAILURE: URL returned {resp.status_code} for key {test_key}")
                    
            # Test Download URL generation
            download_url = storage.get_url(test_key, is_download=True, filename=f"{mat.title}.pdf")
            import urllib.parse
            decoded_url = urllib.parse.unquote(download_url)
            if "response-content-disposition" in download_url.lower():
                print("SUCCESS: Download URL contains content-disposition header.")
                if "filename=" in decoded_url.lower():
                    print(f"SUCCESS: Download URL uses simplified filename encoding: {decoded_url.split('filename=')[-1][:50]}...")
                else:
                    print("FAILURE: Download URL missing filename attribute.")
            else:
                print("FAILURE: Download URL missing content-disposition header.")
    except Exception as e:
        print(f"FAILURE: S3/URL test encountered error: {e}")

async def test_rag_retrieval_refinement():
    print("\n--- Testing Refined RAG Retrieval ---")
    query = "What are the characteristics of data communication?"
    context, sources = await rag.retrieve(query, top_k=5)
    
    print(f"Retrieved context length: {len(context)} chars")
    print(f"Sources identified: {len(sources)}")
    
    if 0 < len(context) <= 7000:
        print("SUCCESS: Context windowing and retrieval functioning.")
    else:
        print(f"WARNING: Context length {len(context)} is outside expected range.")
        
    if sources:
        print(f"Sample source metadata: {sources[0]}")
    else:
        print("FAILURE: No sources found (is FAISS index populated?)")

async def main():
    print("========================================")
    print("      FINAL IMPLEMENTATION AUDIT        ")
    print("========================================\n")
    
    # Critical: Load the index into memory
    rag.load_index()
    
    print(f"Backend Port: 8000")
    print(f"Frontend Port: 5173")
    print(f"Total Configured Keys: {len(settings.NVIDIA_API_KEYS)}")
    
    await test_key_rotation_logic()
    await test_s3_and_presigned_url()
    await test_rag_retrieval_refinement()
    
    print("\n========================================")
    print("         AUDIT SUMMARY COMPLETE         ")
    print("========================================")

if __name__ == "__main__":
    asyncio.run(main())
