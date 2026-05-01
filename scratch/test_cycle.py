import asyncio
import httpx
import uuid

async def test_full_cycle():
    async with httpx.AsyncClient() as client:
        # 1. Register
        email = f"test.student.{uuid.uuid4().hex[:6]}@christuniversity.in"
        password = "QAPass123!"
        reg_payload = {
            "email": email,
            "full_name": "Test Student",
            "roll_no": "12345678",
            "password": password,
            "role": "STUDENT"
        }
        reg_res = await client.post("http://127.0.0.1:8000/api/v1/auth/register", json=reg_payload)
        print(f"Registration {email}: {reg_res.status_code}")
        if reg_res.status_code != 201:
            print(f"Error: {reg_res.text}")
            return

        # 2. Login
        login_data = {
            "username": email,
            "password": password
        }
        login_res = await client.post("http://127.0.0.1:8000/api/v1/auth/login", data=login_data)
        print(f"Login {email}: {login_res.status_code}")
        if login_res.status_code == 200:
            print("Login SUCCESS")
        else:
            print(f"Login FAILED: {login_res.text}")

if __name__ == "__main__":
    asyncio.run(test_full_cycle())
