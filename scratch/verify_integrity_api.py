import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_integrity_filtering():
    # 1. Login as Admin
    print("--- Login as Admin ---")
    admin_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin@christuniversity.in", "password": "AdminPass1!"})
    admin_token = admin_resp.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Login as Student
    print("--- Login as Student ---")
    student_resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "reconcile.student@mca.christuniversity.in", "password": "StudentPass1!"})
    if student_resp.status_code != 200:
        print(f"Student Login Failed: {student_resp.status_code} - {student_resp.text}")
        return
    student_token = student_resp.json().get("access_token")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 3. Check Admin List
    print("\n--- Admin Materials List ---")
    admin_list = requests.get(f"{BASE_URL}/materials", headers=admin_headers).json()
    print(f"Total returned for Admin: {admin_list['total']}")
    statuses = [item['integrity_status'] for item in admin_list['items']]
    print(f"Statuses found: {set(statuses)}")

    # 4. Check Student List
    print("\n--- Student Materials List ---")
    student_list = requests.get(f"{BASE_URL}/materials", headers=student_headers).json()
    print(f"Total returned for Student: {student_list['total']}")
    student_statuses = [item['integrity_status'] for item in student_list['items']]
    print(f"Statuses found (expected only 'available'): {set(student_statuses)}")

    # 5. Check Direct Access to 'missing_file' (E2E Test Syllabus - 0c0bb6d0-5fdc-4eaa-97e3-1fefe176cbb3)
    target_id = "0c0bb6d0-5fdc-4eaa-97e3-1fefe176cbb3"
    print(f"\n--- Testing Direct Access Guard for ID {target_id} ---")
    
    admin_get = requests.get(f"{BASE_URL}/materials/{target_id}", headers=admin_headers)
    print(f"Admin Access Result: {admin_get.status_code} (Expected 200)")
    
    student_get = requests.get(f"{BASE_URL}/materials/{target_id}", headers=student_headers)
    print(f"Student Access Result: {student_get.status_code} (Expected 404)")

    if student_list['total'] == 6 and student_get.status_code == 404:
        print("\nSUCCESS: Integrity Reconciliation Logic Verified.")
    else:
        print("\nFAILURE: Logic check failed.")

if __name__ == "__main__":
    try:
        test_integrity_filtering()
    except Exception as e:
        print(f"Error during test: {e}")
