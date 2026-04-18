import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def test_auth_overhaul():
    print("\n--- Starting Authentication Overhaul Verification ---")
    
    async with httpx.AsyncClient() as client:
        # A. TEST INVALID GMAIL REJECTION
        print("\n[TEST A] Registration - Rejection of common domains (gmail.com)")
        reg_payload = {
            "email": "rohit.ghosh.test@gmail.com",
            "password": "Password123!",
            "full_name": "Test User"
        }
        res = await client.post(f"{BASE_URL}/auth/register", json=reg_payload)
        print(f"Status: {res.status_code}")
        print(f"Detail: {res.json().get('detail')}")
        assert res.status_code == 400
        assert "firstname.lastname@course.christuniversity.in" in res.json().get('detail')
        print("RESULT: SUCCESS (Rejected as expected)")

        # B. TEST INVALID CHRIST FORMAT (missing course)
        print("\n[TEST B] Registration - Rejection of missing course/subdomain")
        reg_payload["email"] = "rohit.ghosh@christuniversity.in"
        res = await client.post(f"{BASE_URL}/auth/register", json=reg_payload)
        print(f"Status: {res.status_code}")
        print(f"Detail: {res.json().get('detail')}")
        assert res.status_code == 400
        print("RESULT: SUCCESS (Rejected as expected)")

        # C. TEST INVALID NAME FORMAT (missing dot)
        print("\n[TEST C] Registration - Rejection of missing firstname.lastname dot")
        reg_payload["email"] = "rohitghosh@mca.christuniversity.in"
        res = await client.post(f"{BASE_URL}/auth/register", json=reg_payload)
        print(f"Status: {res.status_code}")
        print(f"Detail: {res.json().get('detail')}")
        assert res.status_code == 400
        print("RESULT: SUCCESS (Rejected as expected)")

        # D. TEST VALID CHRIST FORMAT (success)
        print("\n[TEST D] Registration - Success for valid multi-part name")
        reg_payload["email"] = "john.doe.mca@mca.christuniversity.in"
        res = await client.post(f"{BASE_URL}/auth/register", json=reg_payload)
        print(f"Status: {res.status_code}")
        if res.status_code == 201:
            print(f"Created User: {res.json().get('email')}")
            print(f"Assigned Role: {res.json().get('role')}")
            assert res.json().get('role') == "STUDENT"
            print("RESULT: SUCCESS (Registered as STUDENT)")
        else:
            print(f"Detail: {res.json()}")

        # E. TEST SEEDED ADMIN LOGIN
        print("\n[TEST E] Login - Seeded Admin account")
        login_data = {
            "username": "rohit.ghosh@mca.christuniversity.in",
            "password": "admin123"
        }
        res = await client.post(f"{BASE_URL}/auth/login", data=login_data)
        print(f"Status: {res.status_code}")
        assert res.status_code == 200
        print("RESULT: SUCCESS (Admin logged in)")

        # F. TEST SEEDED STUDENT LOGIN
        print("\n[TEST F] Login - Seeded Student account")
        login_data = {
            "username": "test.student@mca.christuniversity.in",
            "password": "student123"
        }
        res = await client.post(f"{BASE_URL}/auth/login", data=login_data)
        print(f"Status: {res.status_code}")
        assert res.status_code == 200
        print("RESULT: SUCCESS (Student logged in)")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    try:
        asyncio.run(test_auth_overhaul())
    except Exception as e:
        print(f"\nVerification Failed: {e}")
