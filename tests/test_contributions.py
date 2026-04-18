"""
tests/test_contributions.py
────────────────────────────
Integration tests for Contribution lifecycle APIs.
"""

import pytest


@pytest.mark.asyncio
async def test_submit_contribution(auth_client):
    files = {"file": ("contrib.pdf", b"PDF student notes content", "application/pdf")}
    data = {"title": "Physics Notes", "subject": "Physics", "category": "notes", "semester": 1, "course": "BCA"}
    
    resp = await auth_client.post("/api/v1/contributions", files=files, data=data)
    
    if resp.status_code != 202:
        print("FAILED Response Body:", resp.text)
    
    # 202 Accepted because processing runs in BackgroundTasks
    assert resp.status_code == 202
    json_resp = resp.json()
    assert json_resp["status"] == "pending"
    assert json_resp["title"] == "Physics Notes"


@pytest.mark.asyncio
async def test_get_mine_contributions(auth_client):
    resp = await auth_client.get("/api/v1/contributions/mine")
    assert resp.status_code == 200
    assert "items" in resp.json()
