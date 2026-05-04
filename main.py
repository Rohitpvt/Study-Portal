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
from app.routes import auth, users, materials, contributions, chat, admin, favorites, metadata, support, developer, classrooms, notifications

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from app.utils.monitoring import scrub_sentry_event

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "production"),
        # Privacy: Scrub sensitive data
        before_send=scrub_sentry_event
    )

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
    logger.info("🚀 Starting AI Study Portal...")

    # Create tables (safe for dev; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ready.")

    # Initialize FAISS index in the background (prevents startup timeout on Render/Vercel)
    try:
        from app.services.chatbot_service import build_index
        from app.core.database import AsyncSessionLocal
        
        async def _init_rag():
            async with AsyncSessionLocal() as db:
                await build_index(db)
            logger.info("✅ RAG Knowledge Base ready.")

        import asyncio
        asyncio.create_task(_init_rag())
    except Exception as e:
        logger.warning(f"⚠️  RAG Knowledge Base initialization failed to spawn: {e}")

    # Start background workers
    from app.background.integrity_worker import integrity_worker_loop
    import asyncio
    asyncio.create_task(integrity_worker_loop())
    logger.info("✅ Background workers started.")



    # Seed Developer account from environment
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.user import User, Role
        from app.core.security import hash_password
        from sqlalchemy import select

        async with AsyncSessionLocal() as seed_db:
            dev_email = settings.DEVELOPER_EMAIL
            dev_password = settings.DEVELOPER_PASSWORD

            if dev_email and dev_password:
                result = await seed_db.execute(select(User).where(User.email == dev_email))
                existing = result.scalar_one_or_none()

                if existing:
                    if existing.role != Role.DEVELOPER:
                        existing.role = Role.DEVELOPER
                        await seed_db.commit()
                        logger.info(f"✅ Promoted existing user '{dev_email}' to DEVELOPER role.")
                    else:
                        logger.info(f"✅ Developer account '{dev_email}' already exists.")
                else:
                    new_dev = User(
                        email=dev_email,
                        full_name="Developer",
                        hashed_password=hash_password(dev_password),
                        role=Role.DEVELOPER,
                        is_active=True,
                    )
                    seed_db.add(new_dev)
                    await seed_db.commit()
                    logger.info(f"✅ Created new Developer account: '{dev_email}'")
    except Exception as e:
        logger.warning(f"⚠️  Developer seeding skipped: {e}")

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
# ── Sentry Tagging Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def sentry_tagging_middleware(request, call_next):
    """Inject subsystem and user tags into Sentry context."""
    path = request.url.path
    subsystem = "unknown"
    if path.startswith("/api/v1/auth"): subsystem = "auth"
    elif path.startswith("/api/v1/chat"): subsystem = "chat"
    elif path.startswith("/api/v1/materials"): subsystem = "materials"
    elif path.startswith("/api/v1/contributions"): subsystem = "contribution"
    elif path.startswith("/api/v1/admin"): subsystem = "admin"
    elif path.startswith("/api/v1/developer"): subsystem = "developer"
    elif path.startswith("/api/v1/favorites"): subsystem = "favorites"
    elif path.startswith("/api/v1/classrooms"): subsystem = "classroom"
    
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("subsystem", subsystem)
        scope.set_tag("endpoint", path)
        # Role will be set inside the auth dependency if possible, or we can try to peek at the token here
        # But peaked auth is risky/slow. Better to set role in the actual routes or a shared dependency.
    
    return await call_next(request)

app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Use configured environment origins
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
app.include_router(developer.router,     prefix=API_PREFIX)
app.include_router(classrooms.router,    prefix=API_PREFIX)
app.include_router(notifications.router,   prefix=API_PREFIX)

# ── Static file serving (with isolated CORS sub-app) ───────────────────────────
os.makedirs("uploads", exist_ok=True)

# Created a sub-app for uploads
uploads_app = FastAPI()
uploads_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
uploads_app.mount("/", StaticFiles(directory="uploads"))

app.mount(f"{API_PREFIX}/uploads", uploads_app, name="uploads")

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health check")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}

# ── 404 Redirect Handler ──────────────────────────────────────────────────────
from fastapi.responses import RedirectResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request, exc):
    if exc.status_code == 404:
        # If it's a browser request, redirect to the frontend 404 page
        accept = request.headers.get("accept", "")
        if "text/html" in accept:
            return RedirectResponse(url="/404")
    
    # Otherwise, return a standard JSON error for API clients
    return Response(
        content=f'{{"detail": "{exc.detail}"}}',
        status_code=exc.status_code,
        media_type="application/json"
    )
