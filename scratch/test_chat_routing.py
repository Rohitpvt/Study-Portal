import asyncio
import httpx

BASE_URL = "http://localhost:8000/api/v1"
STUDENT_EMAIL = "student@christuniversity.in"
PASSWORD = "password123"

async def test_chat_routing():
    async with httpx.AsyncClient() as client:
        # Login
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            data={"username": STUDENT_EMAIL, "password": PASSWORD}
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        test_cases = [
            ("A", "How are you?"),
            ("B", "What can you do?"),
            ("C", "What are the characteristics of data communication?"),
            ("D", "Thanks"),
            ("E", "Summarize my uploaded notes") # Note: This might not literally have an uploaded note right now so it might fallback, but we'll see
        ]

        for case_id, query in test_cases:
            print(f"\n--- TEST CASE {case_id} ---")
            print(f"Query: '{query}'")
            resp = await client.post(
                f"{BASE_URL}/chat/ask",
                json={"query": query},
                headers=headers,
                timeout=60.0
            )
            data = resp.json()
            print(f"Mode: {data.get('mode')}")
            print(f"Sources shown: {len(data.get('sources', []))}")
            print(f"Answer: {data.get('answer', '')[:150]}...")

if __name__ == "__main__":
    asyncio.run(test_chat_routing())
