import asyncio
from app.services.llm_service import get_ai_response

async def test_ai():
    print("Testing AI Service...")
    try:
        res = get_ai_response("Hello, are you online? Respond with a single word: YES.")
        print("AI Response:", res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_ai())
