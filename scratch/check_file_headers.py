import httpx
import sys

BASE_URL = "http://localhost:8000/api/v1"

async def check_headers():
    async with httpx.AsyncClient() as client:
        # 1. Login
        print("[1] Logging in...")
        login_res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": "rohit.ghosh@mca.christuniversity.in",
            "password": "adminPassword123"
        })
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get a material ID
        print("[2] Getting materials...")
        list_res = await client.get(f"{BASE_URL}/materials", headers=headers)
        materials = list_res.json()["items"]
        if not materials:
            print("No materials found")
            return
        material = materials[0]
        material_id = material["id"]
        print(f"Selected Material: {material['title']} (ID: {material_id})")

        # 3. Check headers of the /file endpoint
        print(f"[3] Checking headers for /materials/{material_id}/file ...")
        # We use a HEAD request or a GET request and just look at the headers
        file_res = await client.get(f"{BASE_URL}/materials/{material_id}/file", headers=headers, follow_redirects=True)
        
        print("\n--- Response Headers ---")
        for k, v in file_res.headers.items():
            print(f"{k}: {v}")
        print("------------------------")
        
        content_disposition = file_res.headers.get("content-disposition", "")
        if "attachment" in content_disposition.lower():
            print("\n!!! Found 'attachment' in Content-Disposition. This triggers a download.")
        elif "inline" in content_disposition.lower():
            print("\nFound 'inline' in Content-Disposition. This should allow viewing.")
        else:
            print("\nNo Content-Disposition header found.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_headers())
