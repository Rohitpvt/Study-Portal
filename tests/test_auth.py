"""
tests/test_auth.py
───────────────────
Integration tests for User Authentication flow.
"""

import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    payload = {
        "email": "new.user@christuniversity.in",
        "full_name": "New User",
        "password": "Password123!"
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    assert resp.json()["email"] == payload["email"]


@pytest.mark.asyncio
async def test_register_invalid_domain(client):
    payload = {
        "email": "fake.user@gmail.com",
        "full_name": "Fake User",
        "password": "Password123!"
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    assert "christuniversity.in" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client):
    payload = {
        "email": "login.user@christuniversity.in",
        "full_name": "Login User",
        "password": "StrongPassword1!"
    }
    r = await client.post("/api/v1/auth/register", json=payload)
    print("REG:", r.json())
    
    resp = await client.post(
        "/api/v1/auth/login", 
        data={"username": "login.user@christuniversity.in", "password": "StrongPassword1!"}
    )
    print("LOGIN:", resp.json())
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"
