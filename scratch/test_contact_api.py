import requests

base_url = "http://127.0.0.1:8000/api/v1"

payload = {
    "name": "Test User",
    "email": "test@student.christuniversity.in",
    "subject": "This is a test subject",
    "message": "This is a test message to see if the contact endpoint is working correctly."
}

print("Testing contact endpoint...")
try:
    response = requests.post(f"{base_url}/support/contact", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
