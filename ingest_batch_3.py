import os
import requests
import time
import json

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_DATA = {
    "username": "rohit.ghosh@mca.christuniversity.in",
    "password": "Rockstar@00112233"
}

MATERIALS_DIR = "batch3_materials"

def ingest_batch_3():
    # 1. Login
    print("Logging in...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", data=LOGIN_DATA)
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        return
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    files = os.listdir(MATERIALS_DIR)
    results = []

    print(f"Starting ingestion of {len(files)} files...")

    for i, filename in enumerate(files):
        filepath = os.path.join(MATERIALS_DIR, filename)
        # Extract metadata from filename (simple heuristic)
        title = filename.replace("_", " ").replace(".txt", "").replace(".pdf", "")
        
        # Categorize
        if i < 15:
            category = "notes"
        else:
            category = "research_paper"

        # Hardcoded course/semester for test consistency
        course = "BCA"
        semester = 4
        
        # Extract subject from BATCH_3_DATA matching title
        # For simplicity, we'll just use a default or mapped one
        subject = "Multi-disciplinary"
        
        with open(filepath, "rb") as f:
            files_payload = {"file": (filename, f)}
            data_payload = {
                "title": title,
                "course": course,
                "subject": subject,
                "category": category,
                "semester": semester,
                "description": f"Batch 3 scaling test material for {title}."
            }
            
            print(f"[{i+1}/{len(files)}] Uploading {filename}...")
            resp = requests.post(f"{BASE_URL}/materials", headers=headers, data=data_payload, files=files_payload)
            
            if resp.status_code == 201:
                res_data = resp.json()
                print(f"  [SUCCESS] {res_data['id']}")
                results.append({
                    "filename": filename,
                    "id": res_data["id"],
                    "status": "success",
                    "title": title
                })
            else:
                print(f"  [FAILED] {resp.status_code} - {resp.text}")
                results.append({
                    "filename": filename,
                    "status": "failed",
                    "error": resp.text
                })
        
        # Rate limiting safety
        time.sleep(0.5)

    # Save report
    with open("batch3_report.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("\nIngestion complete. Report saved to batch3_report.json")

if __name__ == "__main__":
    ingest_batch_3()
