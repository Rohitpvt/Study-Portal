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
        print("Logging in as Student...")
        # Use student credentials for injection
        student_token = await login("tisha.chhabra@mca.christuniversity.in", "AdminPass1!")
        student_headers = {"Authorization": f"Bearer {student_token}"}
        
        print("Logging in as Admin...")
        admin_token = await login("rohit.ghosh@mca.christuniversity.in", "AdminPass1!")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        print("Injecting test contribution as student...")
        dummy_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Verification Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        files = {"file": ("Verification_Test_Final.pdf", dummy_pdf_content, "application/pdf")}
        data = {
            "title": "DBMS Final Audit Doc",
            "course": "BCA (Bachelor of Computer Applications)",
            "subject": "DBMS",
            "semester": "1",
            "category": "notes",
            "description": "E2E Workflow Verification Document"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{BASE_URL}/contributions", headers=student_headers, data=data, files=files)
            if resp.status_code != 202:
                print(f"Injection Failed: {resp.text}")
                return
            contribution_id = resp.json()["id"]
            print(f"Contribution Injected. ID: {contribution_id}")

            # Wait more for AI review
            print("Waiting 10s for AI background task...")
            await asyncio.sleep(10)

            print(f"Checking contribution status before approval...")
            resp = await client.get(f"{BASE_URL}/contributions/pending", headers=admin_headers)
            pending_items = resp.json().get("items", [])
            contrib = next((item for item in pending_items if item["id"] == contribution_id), None)
            print(f"Current Status: {contrib['status'] if contrib else 'Not found'}")

            print(f"Attempting to Approve Contribution {contribution_id}...")
            # Use PATCH to review
            review_payload = {"approved": True, "admin_notes": "Verified by Antigravity"}
            resp = await client.patch(f"{BASE_URL}/admin/contributions/{contribution_id}/review", headers=admin_headers, json=review_payload)
            
            if resp.status_code == 200:
                print("[SUCCESS] Admin Approval Succeeded (500 Error Fixed)")
            else:
                print(f"[FAILURE] Admin Approval Failed with status {resp.status_code}: {resp.text}")
                return

            print("Verifying if Material was created...")
            resp = await client.get(f"{BASE_URL}/materials?query=DBMS Final Audit Doc", headers=admin_headers)
            materials = resp.json().get("items", [])
            found = any(m["title"] == "DBMS Final Audit Doc" for m in materials)
            if found:
                print("[SUCCESS] Material is searchable in Library (422 Error Fixed)")
            else:
                print(f"[FAILURE] Material not found in Library. Materials lists: {materials}")

            print("Checking Audit Logs...")
            resp = await client.get(f"{BASE_URL}/admin/logs?limit=5", headers=admin_headers)
            logs = resp.json().get("logs", [])
            found_log = any("APPROVE_CONTRIBUTION" in str(l) for l in logs)
            if found_log:
                print("[SUCCESS] Action logged in Audit Trail")
            else:
                print("[FAILURE] Action not found in Audit Logs.")

    except Exception as e:
        print(f"Error during verification: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
