import os
import sys
import asyncio

# Add project root to path
sys.path.append(os.getcwd())

from app.services.llm_service import get_ai_response
from app.core.config import settings

def test_ai_connection():
    print("--- Testing NVIDIA AI Integration ---")
    print(f"API Key present: {bool(settings.NVIDIA_API_KEY)}")
    print(f"Base URL: {settings.NVIDIA_BASE_URL}")
    
    test_prompt = "Hello, tell me a 1-sentence interesting fact about Christ University."
    print(f"Sending prompt: {test_prompt}")
    
    response = get_ai_response(test_prompt)
    print(f"Response: {response}")
    
    if "unavailable" in response.lower() or "unconfigured" in response.lower():
        print("RESULT: FAILED (Fallback or Config Error)")
    else:
        print("RESULT: SUCCESS")

if __name__ == "__main__":
    test_ai_connection()
