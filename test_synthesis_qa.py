import requests
import json
import time

BASE_URL = "http://127.0.0.1:8002"


ADMIN_EMAIL = "rohit.ghosh@mca.christuniversity.in"

def get_token():
    resp = requests.post(f"{BASE_URL}/api/v1/auth/login", data={"username": ADMIN_EMAIL, "password": "Rockstar@00112233"})
    return resp.json()["access_token"]

def ask(query, token, classroom_id=None, assignment_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"query": query}
    if classroom_id:
        payload["classroom_id"] = classroom_id
    if assignment_id:
        payload["assignment_id"] = assignment_id
    
    start_time = time.time()
    for attempt in range(3):
        try:
            resp = requests.post(f"{BASE_URL}/api/v1/chat/ask", json=payload, headers=headers, timeout=60)
            latency = time.time() - start_time
            return resp.json(), latency
        except Exception as e:
            print(f"  [RETRY {attempt+1}] Error: {e}")
            time.sleep(5)
    
    return {"error": "Request failed after 3 attempts"}, 0


def run_qa():
    token = get_token()
    
    # --- 1. INTERDISCIPLINARY SYNTHESIS TESTS (20 Queries) ---
    synthesis_queries = [
        "Compare blockchain security and quantum cryptography.",
        "How do cloud computing and microservices work together?",
        "Explain how 5G supports edge computing.",
        "Compare cybersecurity risks in IoT and cloud systems.",
        "Create revision notes combining DBMS, OS, and Networks.",
        "Compare AI ethics and cybersecurity privacy concerns.",
        "How does distributed computing relate to blockchain?",
        "Explain the relationship between operating systems and virtualization.",
        "Compare data structures and algorithm design strategies.",
        "How do probability and AI models connect?",
        "What is the role of information retrieval in big data analytics?",
        "Synthesize the impact of DevOps on cloud security.",
        "Compare NLP techniques used in sentiment analysis vs bioinformatics.",
        "How does embedded systems design differ for IoT vs real-time systems?",
        "Relate graph theory concepts to social media analytics.",
        "Compare REST and GraphQL performance for mobile AR applications.",
        "Explain how digital image processing is used in computer vision.",
        "What are the similarities between fuzzy logic and probabilistic reasoning?",
        "Compare CI/CD pipelines for serverless vs containerized deployments.",
        "How do data privacy laws affect big data ethics and AI model training?"
    ]
    
    # --- 2. NEGATIVE CONTROL TESTS (8 Queries) ---
    negative_queries = [
        "What is the weather today in Delhi?",
        "Tell me a joke about computers.",
        "Who is the current prime minister of India?",
        "Write a formal birthday message for a professor.",
        "What should I eat for a healthy dinner?",
        "Explain the plot of the movie Inception.",
        "Give me some travel tips for a solo trip to Goa.",
        "What is the current stock price of Tesla?"
    ]
    
    # --- 3. SCOPED TESTS ---
    classroom_id = "378655af-9300-4c4f-b267-9e68529c9cc2"
    scoped_queries = [
        ("Summarize all materials in this classroom.", classroom_id, None),
        ("Compare DBMS and OS topics from this classroom.", classroom_id, None),
        ("Generate 3 practice questions from class materials.", classroom_id, None)
    ]
    
    print("--- INTERDISCIPLINARY SYNTHESIS QA ---")
    
    all_results = []

    def log_result(query, resp, latency, category):
        mode = resp.get("mode", "unknown")
        sources = resp.get("sources", [])
        source_titles = [s['title'] for s in sources]
        
        # Heuristic for success
        passed = False
        if category == "Negative Control":
            passed = (mode == "general" and len(sources) == 0)
        elif category == "Synthesis":
            passed = (mode == "document" and len(sources) >= 2) # Synthesis should ideally find 2+
        elif category == "Scoped":
            passed = (mode == "document" and len(sources) > 0)
            
        res = {
            "query": query,
            "category": category,
            "mode": mode,
            "latency": f"{latency:.2f}s",
            "source_count": len(sources),
            "sources": source_titles[:5],
            "passed": passed
        }
        all_results.append(res)
        print(f"[{category}] Query: {query[:40]}... | Mode: {mode} | Sources: {len(sources)} | Time: {latency:.2f}s | Result: {'PASS' if passed else 'FAIL'}")

    # Run Synthesis
    print("\n[RUNNING SYNTHESIS TESTS]")
    for q in synthesis_queries:
        resp, lat = ask(q, token)
        log_result(q, resp, lat, "Synthesis")
        time.sleep(3) # Small gap

        
    # Run Negative Controls
    print("\n[RUNNING NEGATIVE CONTROL TESTS]")
    for q in negative_queries:
        resp, lat = ask(q, token)
        log_result(q, resp, lat, "Negative Control")
        time.sleep(1)

    # Run Scoped
    print("\n[RUNNING SCOPED TESTS]")
    for q, cid, aid in scoped_queries:
        resp, lat = ask(q, token, classroom_id=cid, assignment_id=aid)
        log_result(q, resp, lat, "Scoped")
        time.sleep(2)


    # --- 4. SUMMARY REPORT ---
    print("\n--- FINAL QA SUMMARY ---")
    categories = ["Synthesis", "Negative Control", "Scoped"]
    for cat in categories:
        cat_res = [r for r in all_results if r["category"] == cat]
        passed = sum(1 for r in cat_res if r["passed"])
        print(f"{cat}: {passed}/{len(cat_res)} PASSED")

    # Detailed FAIL report
    fails = [r for r in all_results if not r["passed"]]
    if fails:
        print("\n--- FAILURES TO INVESTIGATE ---")
        for f in fails:
            print(f"[{f['category']}] {f['query']} -> Mode: {f['mode']}, Sources: {f['source_count']}")

if __name__ == "__main__":
    run_qa()
