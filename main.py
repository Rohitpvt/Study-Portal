"""
main.py
────────
FastAPI application factory and entry point.
Run with: uvicorn main:app --reload
"""

import logging
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine, Base
from app.routes import auth, users, materials, contributions, chat, admin, favorites, metadata, support

# ── Structured Production Logging ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%SZ"
)
logger = logging.getLogger("christ_university_api")

# ── Global Rate Limiting ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute", "5/second"])


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
      - Create all DB tables (idempotent; Alembic handles migrations in prod)
      - Build FAISS index from approved materials
    Shutdown:
      - Dispose DB engine connections
    """
    logger.info("🚀 Starting Christ University Study Platform...")

    # Create tables (safe for dev; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ready.")

    # Initialize FAISS index
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.chatbot_service import build_index
        async with AsyncSessionLocal() as db:
            await build_index(db)
        logger.info("✅ RAG Knowledge Base ready.")
    except Exception as e:
        logger.warning(f"⚠️  RAG Knowledge Base initialization skipped: {e}")

    yield

    # Shutdown
    await engine.dispose()
    logger.info("👋 Application shut down cleanly.")


# ── App Factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Secure student-only platform for Christ University. "
        "Provides study materials access, AI-assisted contribution review, "
        "and an RAG-powered AI chatbot."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Rate Limiting Setup ───────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# ── Middlewares ─────────────────────────────────────────────────────────────
# ── Middlewares ─────────────────────────────────────────────────────────────
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permissive for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Content-Length", "Accept-Ranges", "Content-Disposition", "X-Content-Type-Options"],
)

# ── API Routers ───────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,          prefix=API_PREFIX)
app.include_router(users.router,         prefix=API_PREFIX)
app.include_router(materials.router,     prefix=API_PREFIX)
app.include_router(contributions.router, prefix=API_PREFIX)
app.include_router(chat.router,          prefix=API_PREFIX)
app.include_router(admin.router,         prefix=API_PREFIX)
app.include_router(favorites.router,     prefix=API_PREFIX)
app.include_router(metadata.router,      prefix=API_PREFIX)
app.include_router(support.router,       prefix=API_PREFIX)

# ── Static file serving (with isolated CORS sub-app) ───────────────────────────
os.makedirs("uploads", exist_ok=True)

# Created a sub-app for uploads
uploads_app = FastAPI()
uploads_app.mount("/", StaticFiles(directory="uploads"))

app.mount(f"{API_PREFIX}/uploads", uploads_app, name="uploads")

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health check")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
