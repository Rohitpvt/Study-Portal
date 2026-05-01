import httpx
import asyncio
import sys

BASE_URL = "http://localhost:8000/api/v1"

async def login(email, password):
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BASE_URL}/auth/login", data={
            "username": email,
            "password": password
        })
        if resp.status_code != 200:
            print(f"Login failed for {email}: {resp.text}")
            return None
        return resp.json()["access_token"]

async def run_qa():
    print("--- STARTING CLASSROOM PERMISSIONS QA ---")
    
    # 1. Login all roles
    teacher_token = await login("qa.teacher@christuniversity.in", "QAPass123!")
    student_token = await login("qa.student@mca.christuniversity.in", "QAPass123!")
    stranger_token = await login("qa.stranger@mca.christuniversity.in", "QAPass123!")
    
    if not all([teacher_token, student_token, stranger_token]):
        print("Login failed, aborting.")
        return

    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
    headers_student = {"Authorization": f"Bearer {student_token}"}
    headers_stranger = {"Authorization": f"Bearer {stranger_token}"}

    async with httpx.AsyncClient() as client:
        # 2. Teacher creates classroom
        print("\n[Teacher] Creating QA Test Class...")
        resp = await client.post(f"{BASE_URL}/classrooms/", headers=headers_teacher, json={
            "name": "QA Test Class",
            "subject": "Quality Assurance",
            "section": "A",
            "course": "MCA",
            "semester": 4,
            "description": "Verification classroom"
        })
        if resp.status_code != 201:
            print(f"FAILED to create classroom: {resp.status_code} - {resp.text}")
            return
        classroom = resp.json()
        classroom_id = classroom["id"]
        join_code = classroom["join_code"]
        print(f"SUCCESS: Classroom {classroom_id} created. Join Code: {join_code}")

        # 3. Non-member access check (Student/Stranger)
        print("\n[Security] Verifying non-member access blocked...")
        for name, headers in [("Student", headers_student), ("Stranger", headers_stranger)]:
            resp = await client.get(f"{BASE_URL}/classrooms/{classroom_id}", headers=headers)
            print(f" - {name} access to detail: {resp.status_code} (Expected 403)")
            assert resp.status_code == 403

        # 4. Student joins classroom
        print("\n[Student] Joining classroom...")
        resp = await client.post(f"{BASE_URL}/classrooms/join", headers=headers_student, json={
            "join_code": join_code
        })
        assert resp.status_code == 200
        print("SUCCESS: Student joined.")

        # 5. Member access check
        print("\n[Student] Verifying member access...")
        resp = await client.get(f"{BASE_URL}/classrooms/{classroom_id}", headers=headers_student)
        print(f" - Student access to detail: {resp.status_code} (Expected 200)")
        assert resp.status_code == 200

        # 6. Analytics check
        print("\n[Security] Verifying Student cannot access Analytics...")
        resp = await client.get(f"{BASE_URL}/classrooms/{classroom_id}/analytics", headers=headers_student)
        if resp.status_code != 403:
            print(f"FAILED: Student access to analytics: {resp.status_code} - {resp.text} (Expected 403)")
            return
        print(f" - Student access to analytics: {resp.status_code} (Expected 403)")

        # 7. Teacher access to Analytics
        print("\n[Teacher] Verifying Teacher can access Analytics...")
        resp = await client.get(f"{BASE_URL}/classrooms/{classroom_id}/analytics", headers=headers_teacher)
        print(f" - Teacher access to analytics: {resp.status_code} (Expected 200)")
        assert resp.status_code == 200

        # 8. Private Doubt Leak Test
        print("\n[Privacy] Verifying private doubt isolation...")
        # Student posts a private doubt
        resp = await client.post(f"{BASE_URL}/classrooms/{classroom_id}/comments", headers=headers_student, json={
            "content": "Secret private doubt",
            "visibility": "private"
        })
        assert resp.status_code == 200
        doubt_id = resp.json()["id"]
        
        # Stranger (Non-member) tries to list comments
        resp = await client.get(f"{BASE_URL}/classrooms/{classroom_id}/comments", headers=headers_stranger)
        print(f" - Stranger list comments: {resp.status_code} (Expected 403)")
        assert resp.status_code == 403

        # Teacher sees it
        resp = await client.get(f"{BASE_URL}/classrooms/{classroom_id}/comments?visibility=private", headers=headers_teacher)
        doubts = resp.json()
        found = any(d["id"] == doubt_id for d in doubts)
        print(f" - Teacher sees private doubt: {found} (Expected True)")
        assert found

        # 9. Cleanup
        print("\n[Cleanup] Removing test classroom...")
        # Hard delete if possible or just archive
        # Archive is safer via API
        resp = await client.patch(f"{BASE_URL}/classrooms/{classroom_id}/archive", headers=headers_teacher)
        print(f" - Archive classroom: {resp.status_code}")
        
    print("\n--- PERMISSIONS QA COMPLETE: ALL PASSED ---")

if __name__ == "__main__":
    asyncio.run(run_qa())
