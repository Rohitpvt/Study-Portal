"""
Simulates exactly what the browser Viewer.jsx does:
1. Login -> get token
2. GET /materials/{id} -> get file_url
3. GET the file_url as blob -> verify PDF bytes arrive
"""
import requests

BASE = 'http://127.0.0.1:8000/api/v1'
MATERIAL_ID = 'd673f3dd-2ade-471b-9b99-adb89d9497b9'

# Step 1: Login (same as frontend AuthContext)
print("=== Step 1: Login ===")
r = requests.post(f'{BASE}/auth/login', data={
    'username': 'admin@christuniversity.in',
    'password': 'AdminPass1!'
}, timeout=10)
assert r.status_code == 200, f"Login failed: {r.status_code}"
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print(f"  OK - Token acquired")

# Step 2: GET /materials/{id} (Viewer.jsx line 161)
print("\n=== Step 2: GET material metadata ===")
r = requests.get(f'{BASE}/materials/{MATERIAL_ID}', headers=headers, timeout=10)
print(f"  Status: {r.status_code}")
if r.status_code != 200:
    print(f"  FAILED: {r.text[:300]}")
    exit(1)
data = r.json()
file_url = data.get('file_url')
print(f"  Title: {data.get('title')}")
print(f"  file_url: {file_url}")
print(f"  integrity_status: {data.get('integrity_status')}")

# Step 3: Build full URL (Viewer.jsx lines 183-192)
# The frontend does: serverRoot = apiBase.split('/api/v1')[0] + path
server_root = BASE.split('/api/v1')[0]  # http://127.0.0.1:8000
if file_url.startswith('http'):
    full_url = file_url
else:
    path = file_url if file_url.startswith('/') else f'/{file_url}'
    full_url = f'{server_root}{path}'
print(f"\n=== Step 3: Fetch PDF blob from: {full_url} ===")

# Step 4: GET file as blob (Viewer.jsx line 208)
r = requests.get(full_url, headers=headers, timeout=15, stream=True)
print(f"  Status: {r.status_code}")
print(f"  Content-Type: {r.headers.get('content-type')}")
print(f"  Content-Length: {r.headers.get('content-length')}")
print(f"  Content-Disposition: {r.headers.get('content-disposition')}")
print(f"  CORS Allow-Origin: {r.headers.get('access-control-allow-origin', 'NOT SET')}")

if r.status_code == 200:
    # Read first 4 bytes to verify PDF magic bytes
    chunk = r.raw.read(4)
    is_pdf = chunk == b'%PDF'
    print(f"\n  PDF Magic Bytes: {chunk} -> {'VALID PDF' if is_pdf else 'NOT A PDF!'}")
    print(f"\n>>> RESULT: Document viewer WILL work in the browser <<<")
else:
    print(f"\n  ERROR body: {r.text[:500]}")
    print(f"\n>>> RESULT: Document viewer WILL FAIL - {r.status_code} <<<")
