import requests
import json

# Use the seeded student account
auth_data = {
    "username": "student1@mca.christuniversity.in",
    "password": "H7NhehhQ8eC#"
}

login_response = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data=auth_data)
if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

chat_data = {
    "query": "Hello, who are you?"
}

print("Sending chat request...")
chat_response = requests.post("http://127.0.0.1:8000/api/v1/chat/ask", json=chat_data, headers=headers)

print(f"Status: {chat_response.status_code}")
print(f"Response: {chat_response.text}")
