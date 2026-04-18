import asyncio
import httpx

async def test_bot():
    url = "http://localhost:8000/chat/ask"
    payload = {
        "query": "How many notes are there?",
        "user_id": "test_user",
        "session_id": "test_session"
    }
    
    # We need a valid user in the DB. The add_test_data.py used any user.
    # Let's assume there's a user.
    
    print(f"Testing library query: {payload['query']}")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)
            data = response.json()
            print(f"Status: {response.status_code}")
            print(f"Answer: {data.get('answer')[:100]}...")
            print(f"Mode: {data.get('mode')}")
            
            if data.get('mode') == 'library':
                print("✅ SUCCESS: Library mode triggered.")
            else:
                print(f"❌ FAILURE: Mode was {data.get('mode')}, expected 'library'.")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_bot())
