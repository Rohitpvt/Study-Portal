"""
tests/conftest.py
─────────────────
Pytest fixtures and database overrides for isolated integration testing.
"""

import os
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# MUST SECURE TEST ENV BEFORE IMPORTING APP
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_christ_uni.db"
os.environ["SECRET_KEY"] = "test-secret-key-12345"
os.environ["OPENAI_API_KEY"] = "test-key"

from main import app
from app.core.database import Base, get_db

from sqlalchemy.pool import NullPool

# Create isolated test DB Engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///./test_christ_uni.db",
    connect_args={"check_same_thread": False},
    poolclass=NullPool
)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


# Disable rate limiting during tests
from main import limiter
limiter.enabled = False

from starlette.background import BackgroundTasks

@pytest_asyncio.fixture(autouse=True)
def mock_background_tasks(monkeypatch):
    """Prevent asynchronous background worker threads from clashing with the test SQLite engine."""
    monkeypatch.setattr(BackgroundTasks, "add_task", lambda self, func, *args, **kwargs: None)

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    """Build and teardown the SQLite test database once per session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if os.path.exists("./test_christ_uni.db"):
        os.remove("./test_christ_uni.db")

@pytest_asyncio.fixture
async def db_session():
    """Raw SQLAlchemy session for unit tests."""
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def client():
    """Unauthenticated httpx client with isolated DB session per request."""
    async def _override():
        async with TestingSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    
    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def auth_client(client):
    """Authenticated httpx client (student role)."""
    email = "test.student@christuniversity.in"
    password = os.getenv("ADMIN_TEST_PASSWORD", "TestPassword123!")
    
    # Register user
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Test Student",
        "roll_no": "2447101",
        "password": password
    })
    
    # Login user
    resp = await client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = resp.json().get("access_token")
    
    # Yield authed client
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, 
        base_url="http://test", 
        headers={"Authorization": f"Bearer {token}"}
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_client(client):
    """Authenticated httpx client (admin role)."""
    from app.models.user import User, Role
    from sqlalchemy import select

    email = "admin@christuniversity.in"
    password = os.getenv("ADMIN_TEST_PASSWORD", "TestPassword123!")
    
    # 1. Register as normal student
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "System Admin",
        "roll_no": "2447100",
        "password": password
    })
    
    # 2. Manually promote to admin in DB
    async with TestingSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        user.role = Role.ADMIN
        await session.commit()
    
    # 3. Login
    resp = await client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = resp.json().get("access_token")
    
    # Yield authed client
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, 
        base_url="http://test", 
        headers={"Authorization": f"Bearer {token}"}
    ) as ac:
        yield ac
