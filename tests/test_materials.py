"""
tests/test_materials.py
────────────────────────
Integration tests for Study Materials APIs.
"""

import pytest


@pytest.mark.asyncio
async def test_list_materials_requires_auth(client):
    # Unauthenticated should fail
    resp = await client.get("/api/v1/materials")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_materials_success(auth_client):
    resp = await auth_client.get("/api/v1/materials")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_upload_material(admin_client):
    files = {"file": ("test.pdf", b"PDF document content body", "application/pdf")}
    data = {"title": "Math Notes", "subject": "Math", "category": "notes", "semester": 2, "course": "BCA"}
    
    resp = await admin_client.post("/api/v1/materials", files=files, data=data)
    assert resp.status_code == 201
    
    json_resp = resp.json()
    assert json_resp["title"] == "Math Notes"
    assert json_resp["is_approved"] is True
