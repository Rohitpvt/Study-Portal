"""
Setup Classroom Test Data (Fixed v4)
===================================
Creates a dedicated test classroom and topics, then attaches real materials.
Includes rate limit handling and correct enum casing.
"""

import sys, os, json, time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 1. Authenticate
login_resp = client.post("/api/v1/auth/login", data={
    "username": "rohit.ghosh@mca.christuniversity.in",
    "password": "Rockstar@00112233"
})
token = login_resp.json().get("access_token")
if not token:
    print("FATAL: Login failed")
    sys.exit(1)
headers = {"Authorization": f"Bearer {token}"}

# 2. Create Test Classroom
classroom_data = {
    "name": "BCA - 4th Sem (Hardening Test Final)",
    "section": "A",
    "subject": "Computer Science & Mathematics",
    "course": "BCA",
    "semester": 4,
    "description": "Validation classroom for AI Study Portal hardening."
}
class_resp = client.post("/api/v1/classrooms", headers=headers, json=classroom_data)
if class_resp.status_code not in [200, 201]:
    print(f"FAILED to create classroom: {class_resp.status_code} {class_resp.json()}")
    sys.exit(1)

class_id = class_resp.json()["id"]
print(f"✓ Created Classroom: {classroom_data['name']} (ID: {class_id})")

# 3. Create Topics
TOPICS = [
    {"name": "Database Systems", "description": "Relational models and normalization"},
    {"name": "Core Computing", "description": "OS and Networks"},
    {"name": "Algorithms", "description": "DAA and DS"},
    {"name": "Mathematics", "description": "Probability and Linear Algebra"},
    {"name": "Advanced AI & Cloud", "description": "AI, Cybersecurity and Cloud Architecture"}
]

topic_map = {}
for t in TOPICS:
    resp = client.post(f"/api/v1/classrooms/{class_id}/topics", headers=headers, json=t)
    if resp.status_code in [200, 201]:
        tid = resp.json()["id"]
        topic_map[t["name"]] = tid
        print(f"✓ Created Topic: {t['name']} (ID: {tid})")
    else:
        print(f"✗ FAILED Topic: {t['name']} -> {resp.status_code} {resp.text}")
    time.sleep(0.2) # Rate limit avoid

# 4. Fetch Material IDs
import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
c = conn.cursor()
c.execute("SELECT id, title FROM materials WHERE integrity_status = 'available'")
materials = {row[1]: row[0] for row in c.fetchall()}
conn.close()

# 5. Attachment Mapping
ATTACHMENTS = [
    ("Database Systems", "Database Management Systems", "notes"),
    ("Core Computing", "Operating Systems Concepts", "notes"),
    ("Core Computing", "Computer Networks Fundamentals", "pyq"),
    ("Algorithms", "Design and Analysis of Algorithms", "notes"),
    ("Algorithms", "Data Structures & Algorithms Notes", "sample_paper"),
    ("Mathematics", "Probability and Statistics", "notes"),
    ("Mathematics", "Linear Algebra Essentials", "reference"),
    ("Advanced AI & Cloud", "Introduction to Artificial Intelligence", "notes"),
    ("Advanced AI & Cloud", "Cloud Computing Architecture", "notes")
]

for topic_name, mat_title, section in ATTACHMENTS:
    tid = topic_map.get(topic_name)
    mid = materials.get(mat_title)
    
    if not tid or not mid:
        print(f"SKIPPING: {topic_name} -> {mat_title} (Topic ID: {tid}, Material ID: {mid})")
        continue
        
    resp = client.post(f"/api/v1/classrooms/{class_id}/materials", 
                       headers=headers, 
                       json={
                           "material_id": mid,
                           "topic_id": tid,
                           "section_type": section
                       })
    
    if resp.status_code in [200, 201]:
        print(f"✓ Attached: {mat_title} to {topic_name} as {section}")
    else:
        print(f"✗ FAILED Attachment: {mat_title} to {topic_name} -> {resp.status_code} {resp.text}")
    time.sleep(0.2) # Rate limit avoid

# 6. Create Test Assignment
assignment_data = {
    "title": "Semester Review Assignment",
    "description": "Solve problems related to DBMS and OS.",
    "instructions": "1. Refer to the attached DBMS notes.\n2. Answer all questions.\n3. Submit in PDF format.",
    "due_at": "2026-06-01T00:00:00",
    "points": 100,
    "topic_id": topic_map.get("Database Systems"),
    "status": "published"
}
assign_resp = client.post(f"/api/v1/classrooms/{class_id}/assignments", headers=headers, json=assignment_data)
if assign_resp.status_code in [200, 201]:
    assign_id = assign_resp.json()["id"]
    print(f"✓ Created Assignment: {assignment_data['title']} (ID: {assign_id})")
    
    # Attach material to assignment
    mat_id = materials.get("Database Management Systems")
    if mat_id:
        attach_resp = client.post(f"/api/v1/classrooms/{class_id}/assignments/{assign_id}/attachments", 
                                   headers=headers, 
                                   json={
                                       "title": "DBMS Reference Notes",
                                       "attachment_type": "material",
                                       "material_id": mat_id
                                   })
        if attach_resp.status_code in [200, 201]:
            print(f"✓ Attached Material to Assignment: DBMS Notes")
        else:
            print(f"✗ FAILED Assignment Attachment: {attach_resp.status_code} {attach_resp.text}")
else:
    print(f"✗ FAILED to create assignment: {assign_resp.status_code} {assign_resp.text}")

print(f"\nSETUP COMPLETE. Classroom ID: {class_id}")
