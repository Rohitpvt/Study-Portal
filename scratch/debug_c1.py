import asyncio
import httpx
import time

BASE_URL = "http://localhost:8000/api/v1"
STUDENT_EMAIL = "student@christuniversity.in"
PASSWORD = "password123"

async def debug_c1():
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Login
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            data={"username": STUDENT_EMAIL, "password": PASSWORD}
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        query = "What are the characteristics of data communication?"
        print(f"Querying: {query}")
        
        start = time.time()
        resp = await client.post(
            f"{BASE_URL}/chat/ask",
            json={"query": query},
            headers=headers
        )
        duration = time.time() - start
        
        print(f"Status: {resp.status_code}")
        print(f"Duration: {duration:.2f}s")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Mode: {data.get('mode')}")
            print(f"Sources: {len(data.get('sources', []))}")
            for s in data.get('sources', []):
                print(f"  - {s.get('title')} (Page {s.get('page_number')})")
        else:
            print(f"Error: {resp.text}")

if __name__ == "__main__":
    asyncio.run(debug_c1())
