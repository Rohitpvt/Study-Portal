import asyncio
import os
import sys
import logging

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.services.key_manager import KeyManager
from openai import AsyncOpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("key_audit")

async def test_key(key_index, api_key):
    masked = f"nvapi-...{api_key[-4:]}"
    logger.info(f"Testing Key #{key_index} ({masked})...")
    
    client = AsyncOpenAI(
        base_url=settings.NVIDIA_BASE_URL,
        api_key=api_key
    )
    
    try:
        response = await client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10,
            timeout=10.0
        )
        logger.info(f"✅ Key #{key_index} SUCCESS: {response.choices[0].message.content[:20]}...")
        return True
    except Exception as e:
        logger.error(f"❌ Key #{key_index} FAILED: {e}")
        return False

async def main():
    manager = KeyManager(settings.NVIDIA_API_KEYS)
    all_keys = manager.get_all_keys()
    
    logger.info(f"Starting audit of {len(all_keys)} NVIDIA API keys...")
    
    results = []
    for i, key in enumerate(all_keys):
        success = await test_key(i, key)
        results.append((i, success))
        await asyncio.sleep(1) # Small delay to avoid hitting global IP rate limits
        
    success_count = sum(1 for r in results if r[1])
    logger.info(f"\nAudit Complete: {success_count}/{len(all_keys)} keys functional.")
    
    if success_count == 0:
        logger.error("CRITICAL: All configured NVIDIA API keys have failed.")

if __name__ == "__main__":
    asyncio.run(main())
