import re
import requests

def test_all_logins():
    CRED_FILE = "USER_CREDENTIALS.txt"
    LOGIN_URL = "http://127.0.0.1:8000/api/v1/auth/login"
    
    print(f"Reading credentials from {CRED_FILE}...\n")
    
    users = []
    try:
        with open(CRED_FILE, "r") as f:
            for line in f:
                if "Role:" in line and "Email:" in line and "Password:" in line:
                    # Regex to extract email and password safely
                    email_match = re.search(r"Email:\s*([\w@\.]+)\s*\|", line)
                    pass_match = re.search(r"Password:\s*([^\s]+)", line)
                    
                    if email_match and pass_match:
                        users.append((email_match.group(1), pass_match.group(1)))
    except FileNotFoundError:
        print(f"Error: {CRED_FILE} not found.")
        return

    print(f"Extracted {len(users)} user credentials for testing.\n")
    
    success_count = 0
    failure_count = 0

    import time
    for email, password in users:
        print(f"Testing login for {email}...", end=" ")
        
        # OAuth2 expects form data for username and password
        data = {
            "username": email,
            "password": password
        }
        
        time.sleep(1) # Bypass 5 requests / sec rate limit
        
        try:
            response = requests.post(LOGIN_URL, data=data, timeout=5)
            
            if response.status_code == 200:
                print("SUCCESS (200 OK)")
                success_count += 1
            else:
                print(f"FAILED ({response.status_code}): {response.text}")
                failure_count += 1
        except Exception as e:
            print(f"SERVER CONNECTION FAILED: {str(e)}")
            failure_count += 1

    print("\n" + "="*40)
    print(" LOGIN TEST SUMMARY")
    print("="*40)
    print(f"Total Tested: {len(users)}")
    print(f"Successful:   {success_count}")
    print(f"Failed:       {failure_count}")

if __name__ == "__main__":
    test_all_logins()
