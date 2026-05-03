"""
app/core/config.py
──────────────────
Centralised settings loaded from environment variables / .env file.
"""

from functools import lru_cache
from typing import Any, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "AI Study Portal"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: Any = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "https://study-portal-final-123.vercel.app"
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_allowed_origins(cls, v) -> List[str]:
        if isinstance(v, str):
            # Handle bracketed strings like "['a', 'b']" by cleaning them first
            clean_str = v.strip().strip("[]")
            # Split by comma and clean up individual origins
            return [origin.strip().strip("'\" ") for origin in clean_str.split(",") if origin.strip()]
        return v or []

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── JWT Security ──────────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Developer Seeding ─────────────────────────────────────────────────────
    DEVELOPER_EMAIL: str = "rohit.ghosh@mca.christuniversity.in"
    DEVELOPER_PASSWORD: str = "Rockstar@00112233"

    # ── Email Domain ──────────────────────────────────────────────────────────
    ALLOWED_EMAIL_DOMAIN: str = "christuniversity.in"

    # ── SMTP Configuration ────────────────────────────────────────────────────
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""

    # ── File Storage ──────────────────────────────────────────────────────────
    STORAGE_BACKEND: str = "local"   # "local" | "s3"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 25

    # ── AWS S3 (optional) ─────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    AWS_REGION: str = "ap-south-1"

    # ── OpenAI & NVIDIA NIM ───────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    NVIDIA_API_KEY: str = ""
    # Support for multiple keys (comma-separated env string)
    NVIDIA_API_KEYS: Any = []
    
    # Gemma Keys for Code Generation
    GEMMA_API_KEYS: Any = []
    
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_EMBEDDING_MODEL: str = "nvidia/nv-embedqa-e5-v5"

    @field_validator("NVIDIA_API_KEYS", "GEMMA_API_KEYS", mode="before")
    @classmethod
    def assemble_keys(cls, v, info) -> List[str]:
        if isinstance(v, str):
            # Support both comma-separated and space-separated for flexibility
            return [k.strip() for k in v.replace(",", " ").split() if k.strip()]
        return v or []

    # ── FAISS ─────────────────────────────────────────────────────────────────
    FAISS_INDEX_PATH: str = "faiss_index"
    def model_post_init(self, __context) -> None:
        # Merge single key into list for rotation logic
        if self.NVIDIA_API_KEY and self.NVIDIA_API_KEY not in self.NVIDIA_API_KEYS:
            self.NVIDIA_API_KEYS.insert(0, self.NVIDIA_API_KEY)
        
        # Ensure unique keys only
        seen = set()
        self.NVIDIA_API_KEYS = [x for x in self.NVIDIA_API_KEYS if not (x in seen or seen.add(x))]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @field_validator("STORAGE_BACKEND")
    @classmethod
    def validate_storage_backend(cls, v: str) -> str:
        if v not in {"local", "s3"}:
            raise ValueError("STORAGE_BACKEND must be 'local' or 's3'")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
