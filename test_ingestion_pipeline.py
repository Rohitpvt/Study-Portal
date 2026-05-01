import asyncio
import os
import io
import json
import uuid
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.classroom import Classroom, ClassroomTopic, ClassroomMaterial
from sqlalchemy import select

client = TestClient(app)

def create_dummy_txt(filename, title):
    with open(filename, "w") as f:
        f.write(f"{title}\n\n")
        f.write("This is a real generated TEXT file for academic use.\n")
        f.write(f"Topic: {title}\n")
        # Add enough text to pass the chunking threshold
        text_block = "Machine learning is a subset of artificial intelligence that involves training algorithms to recognize patterns in data. " * 20
        f.write(text_block)

async def run_pipeline():
    report = {}
    
    # 1. Create 3 real TXT files
    files_to_upload = [
        {"file": "Data_Structures.txt", "title": "Data Structures Notes", "subject": "Computer Science"},
        {"file": "Calculus.txt", "title": "Calculus Summary", "subject": "Mathematics"},
        {"file": "Physics.txt", "title": "Physics Laws", "subject": "Physics"}
    ]
    for f in files_to_upload:
        create_dummy_txt(f["file"], f["title"])
    
    # 2. Get Admin Token
    login_resp = client.post("/api/v1/auth/login", data={
        "username": "rohit.ghosh@mca.christuniversity.in",
        "password": "Rockstar@00112233"
    })
    token = login_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Upload Flow
    uploaded_mats = []
    for f in files_to_upload:
        with open(f["file"], "rb") as file_obj:
            response = client.post(
                "/api/v1/materials",
                headers=headers,
                data={
                    "title": f["title"],
                    "description": "Controlled ingestion batch",
                    "subject": f["subject"],
                    "course": "BCA",
                    "semester": 4,
                    "category": "NOTES"
                },
                files={"file": (f["file"], file_obj, "text/plain")}
            )
            data = response.json()
            if response.status_code == 201:
                uploaded_mats.append(data)
            else:
                print("UPLOAD FAILED:", data)
                
    report["materials_uploaded"] = len(uploaded_mats)
    
    # 4. Integrity Check (S3 and Status)
    integrity_results = []
    for m in uploaded_mats:
        mat_id = m["id"]
        # Trigger explicit processing or check status
        r = client.get(f"/api/v1/materials/{mat_id}", headers=headers)
        mat_data = r.json()
        integrity_results.append({
            "id": mat_id,
            "title": mat_data["title"],
            "status": mat_data["integrity_status"]
        })
    report["integrity_results"] = integrity_results

    # 5. Attach to Classroom (Using an existing Topic)
    class_id = "f9cb00a4-fb2f-4e03-9f8c-2a0802ac65e4"
    topic_id = "808dc29b-11d6-4eec-9d68-b85de1995607"
    
    # Attach first material
    first_mat_id = uploaded_mats[0]["id"]
    attach_resp = client.post(f"/api/v1/classrooms/{class_id}/topics/{topic_id}/materials", headers=headers, json={
        "material_id": first_mat_id
    })
    report["classroom_attachment"] = attach_resp.status_code == 200
    
    # Store IDs for output
    report["classroom_id"] = class_id
    
    # Save report
    with open("ingestion_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    print("Ingestion script completed. Run FAISS rebuild manually.")

if __name__ == "__main__":
    asyncio.run(run_pipeline())
