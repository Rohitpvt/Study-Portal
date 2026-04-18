import httpx
import asyncio
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def login(email, password):
    data = {
        "username": email,
        "password": password
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/auth/login", data=data)
        response.raise_for_status()
        return response.json()["access_token"]

async def main():
    try:
        token = await login("tisha.chhabra@mca.christuniversity.in", "AdminPass1!")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Creating a dummy PDF content
        dummy_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Verification Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        
        # In httpx, files are (name, (filename, content, content-type))
        files = {"file": ("Verification_Test.pdf", dummy_pdf_content, "application/pdf")}
        data = {
            "title": "DBMS Verification Doc",
            "course": "BCA (Bachelor of Computer Applications)",
            "subject": "DBMS",
            "semester": "1",
            "category": "notes",
            "description": "E2E Workflow Verification Document"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{BASE_URL}/contributions", headers=headers, data=data, files=files)
            print(f"Status: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
