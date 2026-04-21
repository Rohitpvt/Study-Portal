import requests

# 1. Login
r = requests.post('http://127.0.0.1:8000/api/v1/auth/login', data={'username': 'admin@christuniversity.in', 'password': 'AdminPass1!'}, timeout=10)
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print(f'Login: {r.status_code}')

# 2. Get materials list
r = requests.get('http://127.0.0.1:8000/api/v1/materials', headers=headers, timeout=10)
items = r.json().get('items', [])
print(f'Materials: {r.status_code} | Count: {len(items)}')

if items:
    mid = items[0]['id']
    title = items[0]['title']
    file_url = items[0].get('file_url', 'NO_FILE_URL')
    print(f'First material: {title} | ID: {mid} | file_url: {file_url}')
    
    # 3. Get single material
    r2 = requests.get(f'http://127.0.0.1:8000/api/v1/materials/{mid}', headers=headers, timeout=10)
    print(f'Single material: {r2.status_code}')
    if r2.status_code == 200:
        furl = r2.json().get('file_url', 'NONE')
        print(f'  file_url from single: {furl}')
    
    # 4. Test file endpoint (the one that was crashing)
    r3 = requests.get(f'http://127.0.0.1:8000/api/v1/materials/{mid}/file', headers=headers, timeout=15, stream=True)
    ct = r3.headers.get('content-type', 'UNKNOWN')
    cl = r3.headers.get('content-length', 'UNKNOWN')
    print(f'File stream: {r3.status_code} | Content-Type: {ct} | Size: {cl}')
    if r3.status_code != 200:
        print(f'  ERROR: {r3.text[:500]}')
    else:
        print('  SUCCESS - File streams correctly!')
