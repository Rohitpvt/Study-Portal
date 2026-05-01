"""
Classroom Verification Tests (Fixed)
===================================
Verifies Resource Packet, Classroom AI, and Assignment AI functionality.
"""

import sys, os, json, asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

CLASS_ID = "378655af-9300-4c4f-b267-9e68529c9cc2"
ASSIGN_ID = "8f9cd292-1311-42a6-bb5a-be353a6138d8"

# 1. Authenticate
login_resp = client.post("/api/v1/auth/login", data={
    "username": "rohit.ghosh@mca.christuniversity.in",
    "password": "Rockstar@00112233"
})
token = login_resp.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

print(f"--- VERIFICATION FOR CLASSROOM: {CLASS_ID} ---")

# 2. Resource Packet / Material List Test
print("\n[1] Resource Packet / Material List Test")
resp = client.get(f"/api/v1/classrooms/{CLASS_ID}/materials", headers=headers)
mats = []
if resp.status_code == 200:
    mats = resp.json()
    print(f"✓ Found {len(mats)} classroom materials.")
    for m in mats:
        print(f"  - {m['title']} | Type: {m['section_type']} | ID: {m['id']}")
else:
    print(f"✗ FAILED to list materials: {resp.status_code} {resp.text}")

# 3. Viewer / Download Verification
print("\n[2] Viewer / Download Test")
if mats:
    # Pick one material to test download/view
    sample_mat_id = mats[0]["material_id"]
    resp = client.get(f"/api/v1/materials/{sample_mat_id}", headers=headers)
    if resp.status_code == 200:
        m_data = resp.json()
        print(f"✓ Material: {m_data['title']}")
        print(f"  - File URL: {m_data['file_url'][:50]}...")
        print(f"  - Integrity: {m_data['integrity_status']}")
    else:
        print(f"✗ FAILED to get material detail: {resp.status_code}")

# 4. Classroom AI Test
print("\n[3] Classroom AI Test")
queries = [
    "Explain normalization from DBMS notes.",
    "What is deadlock in operating systems?",
    "Explain TCP vs UDP from the networking material.",
    "What are the service models in cloud computing?"
]

for q in queries:
    resp = client.post("/api/v1/chat/ask", headers=headers, json={
        "query": q,
        "classroom_id": CLASS_ID
    })
    if resp.status_code == 200:
        data = resp.json()
        print(f"Q: {q}")
        print(f"  A: {data['response'][:100]}...")
        sources = data.get("sources", [])
        print(f"  Sources: {[s['title'] for s in sources]}")
    else:
        print(f"✗ FAILED Classroom AI: {q} -> {resp.status_code} {resp.text}")

# 5. Assignment AI Test
print("\n[4] Assignment AI Test")
q = "Give me a hint for the DBMS normalization question."
resp = client.post("/api/v1/chat/ask", headers=headers, json={
    "query": q,
    "assignment_id": ASSIGN_ID
})
if resp.status_code == 200:
    data = resp.json()
    print(f"Q: {q}")
    print(f"  A: {data['response'][:100]}...")
    print(f"  Sources: {[s['title'] for s in data.get('sources', [])]}")
else:
    print(f"✗ FAILED Assignment AI -> {resp.status_code} {resp.text}")

print("\n--- VERIFICATION COMPLETE ---")
