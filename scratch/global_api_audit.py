import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def audit_api():
    print("=== Project-Wide API Health Audit ===")
    
    # 1. Health Check
    try:
        health = requests.get("http://127.0.0.1:8000/health").json()
        print(f"Health: {health}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

    # 2. Authentication Audit
    print("\n--- Authentication ---")
    admin_data = {"username": "admin@christuniversity.in", "password": "AdminPass1!"}
    student_data = {"username": "reconcile.student@mca.christuniversity.in", "password": "StudentPass1!"}
    
    admin_token = None
    student_token = None
    
    try:
        r = requests.post(f"{BASE_URL}/auth/login", data=admin_data)
        admin_token = r.json().get("access_token")
        print(f"Admin Login: {r.status_code}")
    except Exception as e:
        print(f"Admin Login Failed: {e}")
        
    try:
        r = requests.post(f"{BASE_URL}/auth/login", data=student_data)
        student_token = r.json().get("access_token")
        print(f"Student Login: {r.status_code}")
    except Exception as e:
        print(f"Student Login Failed: {e}")

    if not admin_token: return
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Routes Audit (Get)
    routes = [
        "/materials",
        "/materials/categories",
        "/users/me",
        "/favorites",
        "/contributions/mine",
        "/contributions/pending"
    ]
    
    print("\n--- Routes Verification ---")
    for route in routes:
        try:
            r = requests.get(f"{BASE_URL}{route}", headers=headers)
            print(f"{route:<30} | {r.status_code} | {len(str(r.content)):>6} bytes")
            if r.status_code != 200:
                print(f"   ERROR: {r.text}")
        except Exception as e:
            print(f"{route:<30} | Failed: {e}")

    # 4. Chat System Check (Mock ping)
    print("\n--- Chat System ---")
    try:
        chat_data = {"query": "Audit ping", "history": [], "session_id": None}
        # Testing if endpoint exists and handles a simple ping
        r = requests.post(f"{BASE_URL}/chat/ask", headers=headers, json=chat_data)
        print(f"Chat Endpoint (/ask): {r.status_code}")
    except Exception as e:
        print(f"Chat Audit Failed: {e}")

if __name__ == "__main__":
    audit_api()
