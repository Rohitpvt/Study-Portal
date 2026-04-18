import requests
import uuid
import json
import time

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "rohit.ghosh@mca.christuniversity.in"
PASSWORD = "AdminPass1!"

def get_token():
    print(f"Logging in as {EMAIL}...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        raise Exception(f"Login failed: {resp.text}")
    return resp.json()["access_token"]

QUERIES = [
    # Category A: General
    {"id": 1,  "q": "How are you?", "cat": "A", "exp": "general"},
    {"id": 2,  "q": "What can you do?", "cat": "A", "exp": "general"},
    {"id": 3,  "q": "Who are you?", "cat": "A", "exp": "general"},
    {"id": 4,  "q": "Thanks", "cat": "A", "exp": "general"},
    {"id": 5,  "q": "Hello", "cat": "A", "exp": "general"},
    # Category B: Document-Based (RAG)
    {"id": 6,  "q": "What is data communication?", "cat": "B", "exp": "document"},
    {"id": 7,  "q": "Explain characteristics of data communication", "cat": "B", "exp": "document"},
    {"id": 8,  "q": "What are components of a communication system?", "cat": "B", "exp": "document"},
    {"id": 9,  "q": "Summarize data communication notes", "cat": "B", "exp": "document"},
    {"id": 10, "q": "What is bandwidth in networking?", "cat": "B", "exp": "document"},
    # Category C: Library Inventory (New)
    {"id": 11, "q": "How many notes are there?", "cat": "C", "exp": "library"},
    {"id": 12, "q": "What subjects are available?", "cat": "C", "exp": "library"},
    {"id": 13, "q": "List all materials in the library", "cat": "C", "exp": "library"},
    {"id": 14, "q": "What topics do you have for data communication?", "cat": "C", "exp": "library"},
    {"id": 15, "q": "Show available notes", "cat": "C", "exp": "library"},
    # Category D: Out-of-Domain
    {"id": 16, "q": "How to bake a cake?", "cat": "D", "exp": "general"},
    {"id": 17, "q": "What is machine learning?", "cat": "D", "exp": "general"},
    {"id": 18, "q": "Who is the prime minister of India?", "cat": "D", "exp": "general"},
    # Category E: Edge / Robustness
    {"id": 19, "q": "", "cat": "E", "exp": "general_or_error"},
    {"id": 20, "q": "asdasdasdasd random text spam", "cat": "E", "exp": "general"},
]

def run_test():
    try:
        token = get_token()
    except Exception as e:
        print(f"FATAL: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    results = []

    print("\nStarting stress test (20 queries)...\n")
    print(f"{'ID':<3} | {'Cat':<3} | {'Status':<6} | {'Mode':<9} | {'Q':<30} | {'Sources':<7} | {'Result'}")
    print("-" * 100)

    for item in QUERIES:
        session_id = str(uuid.uuid4())
        payload = {
            "query": item["q"],
            "session_id": session_id
        }
        
        try:
            start_time = time.time()
            resp = requests.post(f"{BASE_URL}/chat/ask", json=payload, headers=headers)
            latency = time.time() - start_time
            
            status = resp.status_code
            data = resp.json() if status == 200 else {"error": resp.text}
            
            mode = data.get("mode", "ERR")
            answer = data.get("answer", "")
            sources = data.get("sources", [])
            source_count = len(sources)
            
            # Basic validation logic
            passed = True
            fail_reason = ""
            
            if status >= 500:
                passed = False
                fail_reason = "Server Crash (5xx)"
            elif item["exp"] == "document" and mode != "document":
                passed = False
                fail_reason = f"Expected document mode, got {mode}"
            elif item["exp"] == "library" and mode != "library":
                passed = False
                fail_reason = f"Expected library mode, got {mode}"
            elif item["exp"] == "general" and mode != "general":
                passed = False
                fail_reason = f"Expected general mode, got {mode}"
            
            # Grounding/Hallucination Checks
            if item["cat"] == "C" and "million" in answer.lower():
                passed = False
                fail_reason = "Hallucinated global statistics in library mode"
            
            if item["cat"] == "B" and source_count == 0:
                passed = False
                fail_reason = "No sources for document query"

            snippet = answer.split("\n")[0][:60] + "..." if answer else "N/A"
            res_str = "PASS" if passed else f"FAIL ({fail_reason})"
            
            print(f"{item['id']:<3} | {item['cat']:<3} | {status:<6} | {mode:<9} | {item['q'][:30]:<30} | {source_count:<7} | {res_str}")
            
            results.append({
                "id": item["id"],
                "category": item["cat"],
                "query": item["q"],
                "status": status,
                "mode": mode,
                "answer_snippet": snippet,
                "sources": sources,
                "source_count": source_count,
                "passed": passed,
                "fail_reason": fail_reason
            })
            
        except Exception as e:
            print(f"{item['id']:<3} | {item['cat']:<3} | ERROR  | N/A       | {item['q'][:30]:<30} | 0       | FAIL ({str(e)})")
            results.append({
                "id": item["id"],
                "category": item["cat"],
                "query": item["q"],
                "status": "ERR",
                "mode": "ERR",
                "answer_snippet": "ERROR",
                "sources": [],
                "source_count": 0,
                "passed": False,
                "fail_reason": str(e)
            })

    # Summary
    p_count = sum(1 for r in results if r["passed"])
    f_count = len(results) - p_count
    
    print("\n" + "="*50)
    print(f"STRESS TEST SUMMARY")
    print(f"Total Queries: {len(results)}")
    print(f"Passed:        {p_count}")
    print(f"Failed:        {f_count}")
    print("="*50)
    
    # Save results to JSON for final reporting extraction
    with open("stress_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nDetailed results saved to stress_test_results.json")

if __name__ == "__main__":
    run_test()
