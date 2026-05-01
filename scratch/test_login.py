import asyncio
import httpx

async def test_login(email, password):
    async with httpx.AsyncClient() as client:
        url = "http://127.0.0.1:8000/api/v1/auth/login"
        data = {
            "username": email,
            "password": password
        }
        response = await client.post(url, data=data)
        print(f"Login {email}: {response.status_code}")
        if response.status_code == 200:
            print(f"Success: {response.json().get('access_token')[:10]}...")
        else:
            print(f"Error: {response.text}")

async def main():
    # Test Teacher
    await test_login("qa.teacher@christuniversity.in", "QAPass123!")
    # Test Student
    await test_login("qa.student@mca.christuniversity.in", "QAPass123!")
    # Test New Student from subagent run if exists
    await test_login("qa.student5@christuniversity.in", "QAPass123!")

if __name__ == "__main__":
    asyncio.run(main())
