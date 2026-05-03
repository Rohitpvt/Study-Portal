import requests
import json
import time

BASE_URL = "http://127.0.0.1:8888"

ADMIN_EMAIL = "rohit.ghosh@mca.christuniversity.in"

def get_token():
    resp = requests.post(f"{BASE_URL}/api/v1/auth/login", data={"username": ADMIN_EMAIL, "password": "Rockstar@00112233"})
    return resp.json()["access_token"]

def ask(query, token, classroom_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"query": query}
    if classroom_id:
        payload["classroom_id"] = classroom_id
    
    start_time = time.time()
    try:
        resp = requests.post(f"{BASE_URL}/api/v1/chat/ask", json=payload, headers=headers, timeout=180)
        latency = time.time() - start_time
        return resp.json(), latency
    except Exception as e:
        return {"error": str(e)}, 0

def run_qa():
    token = get_token()
    
    # Selection of diverse queries
    queries = [
        # Synthesis
        ("Compare blockchain security and quantum cryptography.", "Synthesis"),
        ("How do cloud computing and microservices work together?", "Synthesis"),
        ("Explain how 5G supports edge computing.", "Synthesis"),
        ("Compare cybersecurity risks in IoT and cloud systems.", "Synthesis"),
        ("Create revision notes combining DBMS and OS.", "Synthesis"),
        ("Compare AI ethics and cybersecurity privacy concerns.", "Synthesis"),
        ("How does distributed computing relate to blockchain?", "Synthesis"),
        ("Explain the relationship between OS and virtualization.", "Synthesis"),
        ("Compare data structures and algorithm design.", "Synthesis"),
        ("How do probability and AI models connect?", "Synthesis"),
        
        # Negative Controls
        ("What is the weather today?", "Negative"),
        ("Tell me a joke.", "Negative"),
        ("Who is Elon Musk?", "Negative"),
        ("How do I cook pasta?", "Negative"),
        ("Give me travel tips for Goa.", "Negative"),
        
        # Scoped
        ("Summarize all materials in this classroom.", "Scoped"),
        ("Compare DBMS and OS topics from this class.", "Scoped"),
        ("Generate practice questions from class notes.", "Scoped")
    ]
    
    classroom_id = "378655af-9300-4c4f-b267-9e68529c9cc2"
    
    print("--- FINAL STABILIZED QA RUN ---")
    results = []
    
    for q_text, cat in queries:
        cid = classroom_id if cat == "Scoped" else None
        print(f"[{cat}] Asking: {q_text[:50]}...")
        
        resp, lat = ask(q_text, token, cid)
        mode = resp.get("mode", "unknown")
        sources = resp.get("sources", [])
        
        passed = False
        if cat == "Negative":
            passed = (mode == "general" and len(sources) == 0)
        elif cat == "Synthesis":
            passed = (mode == "document" and len(sources) >= 1) # Synthesis is harder, 1+ is grounded
        elif cat == "Scoped":
            passed = (mode == "document" and len(sources) > 0)
            
        print(f"  Result: {'PASS' if passed else 'FAIL'} | Mode: {mode} | Sources: {len(sources)} | Time: {lat:.2f}s")
        results.append({"query": q_text, "category": cat, "passed": passed, "sources": len(sources)})
        
        time.sleep(5) # Deep sleep to avoid DB locking
        
    print("\n--- QA SUMMARY ---")
    for cat in ["Synthesis", "Negative", "Scoped"]:
        cat_res = [r for r in results if r["category"] == cat]
        passed = sum(1 for r in cat_res if r["passed"])
        print(f"{cat}: {passed}/{len(cat_res)} PASSED")

if __name__ == "__main__":
    run_qa()
