import sys
import os
import asyncio
import httpx

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

async def test_endpoints():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # First, login to get a token
        login_response = await client.post("/api/v1/auth/login", data={
            "username": "rohit.ghosh@mca.christuniversity.in",
            "password": "Password123!"
        })
        token = login_response.json().get("access_token")
        if not token:
            print("Login failed:", login_response.text)
            # Try a different user if needed or create one. We might just rely on checking an endpoint
        
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        # Test GET /materials
        print("\n--- GET /materials ---")
        mat_res = await client.get("/api/v1/materials?page=1&page_size=10", headers=headers)
        print("Status:", mat_res.status_code)
        if mat_res.status_code == 422:
            print("ValidationError details:", mat_res.text)
        elif mat_res.status_code == 200:
            items = mat_res.json().get("items", [])
            print(f"Got {len(items)} items.")
            if items:
                mid = items[0]["id"]
                print(f"\n--- GET /materials/{mid} ---")
                single_res = await client.get(f"/api/v1/materials/{mid}", headers=headers)
                print("Status:", single_res.status_code)
                if single_res.status_code != 200:
                    print("Error:", single_res.text)
                else:
                    print("File URL:", single_res.json().get("file_url"))
        else:
            print("Error:", mat_res.text)

if __name__ == "__main__":
    asyncio.run(test_endpoints())
