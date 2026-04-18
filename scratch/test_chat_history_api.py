import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from main import app
from app.core.database import Base, get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Role
from app.models.chat import ChatSession, ChatMessage

# Mock Data
USER_1_ID = "user-1-id"
USER_2_ID = "user-2-id"

async def mock_get_current_user_1():
    return User(id=USER_1_ID, email="user1@test.com", role=Role.STUDENT, full_name="User One")

async def mock_get_current_user_2():
    return User(id=USER_2_ID, email="user2@test.com", role=Role.STUDENT, full_name="User Two")

# Setup Test Database (Memory for Speed)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DATABASE_URL, echo=False)
AsyncSessionTesting = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def override_get_db():
    async with AsyncSessionTesting() as session:
        yield session

async def test_chat_history_flow():
    # Setup tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Dependency overrides
    app.dependency_overrides[get_current_user] = mock_get_current_user_1
    app.dependency_overrides[get_db] = override_get_db
    
    # Use AsyncClient for async FastAPI testing
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        
        # 1. Test Session Creation
        resp = await ac.post("/api/v1/chat/sessions", json={"title": "Test Session"})
        assert resp.status_code == 201
        session_id = resp.json()["id"]
        assert resp.json()["title"] == "Test Session"
        
        # 2. Inject messages manually to test retrieval
        async with AsyncSessionTesting() as db:
            msg1 = ChatMessage(session_id=session_id, role="user", content="Hello AI", mode="general")
            msg2 = ChatMessage(session_id=session_id, role="assistant", content="Hello User Content", mode="general")
            db.add_all([msg1, msg2])
            await db.commit()

        # 3. Test Session List
        resp = await ac.get("/api/v1/chat/sessions")
        assert resp.status_code == 200
        data = resp.json()["sessions"]
        assert len(data) == 1
        assert data[0]["id"] == session_id
        # In the list view, our selectinload(ChatSession.messages) ensures preview is available
        assert data[0]["latest_message_preview"] == "Hello User Content"

        # 4. Test Session Details
        resp = await ac.get(f"/api/v1/chat/sessions/{session_id}")
        assert resp.status_code == 200
        assert len(resp.json()["messages"]) == 2
        assert resp.json()["messages"][0]["role"] == "user"

        # 5. Test Rename
        resp = await ac.patch(f"/api/v1/chat/sessions/{session_id}", json={"title": " Renamed Session "})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Renamed Session" # Trimmed

        # 6. Test User Isolation (Security)
        app.dependency_overrides[get_current_user] = mock_get_current_user_2
        # User 2 tries to access User 1's session
        resp = await ac.get(f"/api/v1/chat/sessions/{session_id}")
        assert resp.status_code == 404

        # 7. Test Delete
        app.dependency_overrides[get_current_user] = mock_get_current_user_1
        resp = await ac.delete(f"/api/v1/chat/sessions/{session_id}")
        assert resp.status_code == 204
        
        # Verify gone
        resp = await ac.get("/api/v1/chat/sessions")
        assert len(resp.json()["sessions"]) == 0

    print("\n✅ All Chat History API Tests Passed (Async)!")

if __name__ == "__main__":
    asyncio.run(test_chat_history_flow())
