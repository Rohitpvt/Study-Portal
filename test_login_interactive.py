import asyncio
from httpx import AsyncClient, ASGITransport
from main import app

async def main():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/register", json={
            "email": "test99@christuniversity.in",
            "full_name": "Test",
            "password": "Password123!"
        })
        print("Register Status:", res.status_code)
        print("Register Body:", res.text)

        resp = await ac.post("/api/v1/auth/login", data={
            "username": "test99@christuniversity.in",
            "password": "Password123!"
        })
        print("Login Status:", resp.status_code)
        print("Login Body:", resp.text)

asyncio.run(main())
