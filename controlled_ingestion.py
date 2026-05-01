"""
Controlled Real Material Ingestion Pipeline
=============================================
Phase 1: Upload 3 TXT files via the API (they will be marked indexing_failed
          because no FAISS index exists yet — this is expected).
Phase 2: Run reindex_all.py to batch-build the FAISS index and promote
          all materials to 'available'.
"""

import sys, os, json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# ── Step 1: Create 3 real TXT study materials ─────────────────────────────────
MATERIALS = [
    {
        "file": "DS_Notes.txt",
        "title": "Data Structures & Algorithms Notes",
        "subject": "Computer Science",
        "content": (
            "Data Structures & Algorithms Notes\n\n"
            "Chapter 1: Arrays and Linked Lists\n"
            "An array is a contiguous block of memory that stores elements of the same type. "
            "Access time is O(1) for indexing but O(n) for insertion and deletion in the worst case. "
            "A linked list is a chain of nodes where each node contains data and a pointer to the next node. "
            "Singly linked lists allow forward traversal only, while doubly linked lists allow bidirectional traversal. "
            "Advantages of linked lists include dynamic sizing and efficient insertion/deletion at known positions. "
            "Disadvantages include O(n) access time and extra memory for pointers.\n\n"
            "Chapter 2: Stacks and Queues\n"
            "A stack is a Last-In-First-Out (LIFO) data structure. Operations include push, pop, and peek, "
            "all running in O(1) time. Stacks are used in expression evaluation, backtracking, and function call management. "
            "A queue is a First-In-First-Out (FIFO) data structure. Operations include enqueue, dequeue, and front. "
            "Circular queues solve the problem of wasted space in linear queues. Priority queues allow elements "
            "to be dequeued based on priority rather than insertion order.\n\n"
            "Chapter 3: Trees and Graphs\n"
            "A binary tree is a hierarchical structure where each node has at most two children. "
            "Binary Search Trees (BST) maintain the property that left child < parent < right child. "
            "AVL trees are self-balancing BSTs that maintain O(log n) height. "
            "Graphs consist of vertices and edges, which can be directed or undirected, weighted or unweighted. "
            "Common graph algorithms include BFS, DFS, Dijkstra's shortest path, and Kruskal's MST algorithm.\n\n"
            "Chapter 4: Sorting Algorithms\n"
            "Bubble sort: O(n^2) average and worst case. Simple but inefficient for large datasets. "
            "Merge sort: O(n log n) in all cases. Uses divide-and-conquer strategy. Requires O(n) extra space. "
            "Quick sort: O(n log n) average, O(n^2) worst case. In-place but not stable. "
            "Heap sort: O(n log n) in all cases. In-place and based on the binary heap data structure. "
            "Radix sort: O(nk) where k is the number of digits. Non-comparative sorting algorithm.\n\n"
            "Chapter 5: Hashing\n"
            "Hash tables provide O(1) average time for search, insert, and delete operations. "
            "Hash functions map keys to indices in the table. Collision resolution strategies include "
            "chaining (linked lists at each index) and open addressing (linear probing, quadratic probing). "
            "Load factor is the ratio of elements to table size and affects performance significantly."
        )
    },
    {
        "file": "Calculus_Summary.txt",
        "title": "Calculus I Summary Notes",
        "subject": "Mathematics",
        "content": (
            "Calculus I Summary Notes\n\n"
            "Chapter 1: Limits and Continuity\n"
            "The limit of a function f(x) as x approaches a value c is the value that f(x) approaches. "
            "Formally, lim(x→c) f(x) = L means for every ε > 0, there exists δ > 0 such that "
            "0 < |x - c| < δ implies |f(x) - L| < ε. A function is continuous at a point c if "
            "f(c) is defined, lim(x→c) f(x) exists, and lim(x→c) f(x) = f(c). "
            "The Intermediate Value Theorem states that if f is continuous on [a,b] and k is between "
            "f(a) and f(b), then there exists some c in (a,b) such that f(c) = k.\n\n"
            "Chapter 2: Derivatives\n"
            "The derivative f'(x) represents the instantaneous rate of change of f at point x. "
            "Power rule: d/dx[x^n] = nx^(n-1). Product rule: d/dx[fg] = f'g + fg'. "
            "Quotient rule: d/dx[f/g] = (f'g - fg')/g^2. Chain rule: d/dx[f(g(x))] = f'(g(x)) * g'(x). "
            "Applications include finding velocity from position, optimization problems, and linear approximation. "
            "Critical points occur where f'(x) = 0 or f'(x) is undefined. "
            "The second derivative test: if f''(c) > 0 the point is a local minimum, if f''(c) < 0 it is a local maximum.\n\n"
            "Chapter 3: Integrals\n"
            "The definite integral ∫[a,b] f(x)dx represents the signed area under the curve. "
            "The Fundamental Theorem of Calculus connects derivatives and integrals: "
            "if F'(x) = f(x), then ∫[a,b] f(x)dx = F(b) - F(a). "
            "Common techniques include substitution (u-substitution), integration by parts, "
            "partial fractions, and trigonometric substitution. "
            "Applications include computing areas, volumes of revolution, arc length, and work done by a force."
        )
    },
    {
        "file": "Physics_Mechanics.txt",
        "title": "Classical Mechanics Summary",
        "subject": "Physics",
        "content": (
            "Classical Mechanics Summary\n\n"
            "Chapter 1: Newton's Laws of Motion\n"
            "First Law (Inertia): An object at rest stays at rest, and an object in motion stays in motion "
            "with the same speed and direction, unless acted upon by an unbalanced force. "
            "Second Law: F = ma. The net force acting on an object equals the mass of the object "
            "multiplied by its acceleration. This is the most important equation in classical mechanics. "
            "Third Law: For every action, there is an equal and opposite reaction. "
            "Forces always come in pairs acting on different objects.\n\n"
            "Chapter 2: Work, Energy and Power\n"
            "Work done W = F·d·cos(θ) where F is force, d is displacement, and θ is the angle between them. "
            "Kinetic energy KE = (1/2)mv^2. Potential energy PE = mgh for gravitational potential energy. "
            "The Work-Energy Theorem states that net work done equals change in kinetic energy. "
            "Conservation of energy: in an isolated system, total energy remains constant. "
            "Power P = W/t = Fv, measured in Watts.\n\n"
            "Chapter 3: Momentum and Collisions\n"
            "Linear momentum p = mv. Newton's second law can be written as F = dp/dt. "
            "Conservation of momentum: in the absence of external forces, total momentum is conserved. "
            "Elastic collisions conserve both momentum and kinetic energy. "
            "Inelastic collisions conserve momentum but not kinetic energy. "
            "Perfectly inelastic collisions result in the objects sticking together.\n\n"
            "Chapter 4: Rotational Motion\n"
            "Angular velocity ω = dθ/dt. Angular acceleration α = dω/dt. "
            "Torque τ = r × F = Iα where I is the moment of inertia. "
            "Angular momentum L = Iω is conserved in the absence of external torques. "
            "Moment of inertia depends on mass distribution relative to the axis of rotation. "
            "For a solid cylinder I = (1/2)MR^2, for a solid sphere I = (2/5)MR^2."
        )
    }
]

# ── Create files ──────────────────────────────────────────────────────────────
for mat in MATERIALS:
    with open(mat["file"], "w", encoding="utf-8") as f:
        f.write(mat["content"])
    print(f"✓ Created {mat['file']} ({os.path.getsize(mat['file'])} bytes)")

# ── Authenticate ──────────────────────────────────────────────────────────────
login_resp = client.post("/api/v1/auth/login", data={
    "username": "rohit.ghosh@mca.christuniversity.in",
    "password": "Rockstar@00112233"
})
token = login_resp.json().get("access_token")
if not token:
    print("FATAL: Login failed. Cannot proceed.")
    print(login_resp.json())
    sys.exit(1)
headers = {"Authorization": f"Bearer {token}"}
print(f"✓ Authenticated successfully.")

# ── Upload each file ──────────────────────────────────────────────────────────
uploaded = []
for mat in MATERIALS:
    with open(mat["file"], "rb") as file_obj:
        resp = client.post(
            "/api/v1/materials",
            headers=headers,
            data={
                "title": mat["title"],
                "description": "Controlled ingestion batch - real academic content",
                "subject": mat["subject"],
                "course": "BCA",
                "semester": "4",
                "category": "NOTES"
            },
            files={"file": (mat["file"], file_obj, "text/plain")}
        )
    
    if resp.status_code == 201:
        data = resp.json()
        uploaded.append(data)
        print(f"✓ Uploaded: {mat['title']} → ID: {data['id']} | Status: {data.get('integrity_status', 'N/A')}")
    else:
        print(f"✗ FAILED: {mat['title']} → {resp.status_code}: {resp.json()}")

# ── Report ────────────────────────────────────────────────────────────────────
report = {
    "materials_created": len(uploaded),
    "materials": [{"id": m["id"], "title": m["title"], "status": m.get("integrity_status")} for m in uploaded],
    "next_step": "Run: venv\\Scripts\\python scripts\\reindex_all.py --dry-run"
}

with open("ingestion_report.json", "w") as f:
    json.dump(report, f, indent=2)

print(f"\n{'='*60}")
print(f"UPLOAD COMPLETE: {len(uploaded)}/{len(MATERIALS)} materials uploaded.")
print(f"Report saved to ingestion_report.json")
print(f"Next step: run reindex_all.py --dry-run to verify, then reindex_all.py to build index.")
print(f"{'='*60}")
