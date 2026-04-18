"""
app/services/auth_service.py
─────────────────────────────
Business logic for user registration, login, and token refresh.
"""

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import Role, User
from app.models.base import generate_uuid
from app.schemas.auth import RegisterRequest, TokenResponse
from app.utils.email_validator import is_christ_email, is_valid_christ_email, extract_department


async def register_user(payload: RegisterRequest, db: AsyncSession) -> User:
    """
    Register a new student.
    Enforces @christuniversity.in domain and rejects duplicate emails.
    """
    # 1. Domain and format check (Centralized)
    if not is_christ_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use your official Christ University email (firstname.lastname@course.christuniversity.in)"
        )

    # 2. Duplicate email check
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # 3. Roll Number validation
    roll_no = payload.roll_no.strip() if payload.roll_no else ""
    if not roll_no:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admission/Roll Number is required."
        )

    # 4. Create user
    user = User(
        id=generate_uuid(),
        email=payload.email,
        full_name=payload.full_name,
        roll_no=roll_no,
        hashed_password=hash_password(payload.password),
        role=Role.STUDENT,
        department=extract_department(payload.email),
        course=extract_department(payload.email),
        is_active=True,
    )
    db.add(user)
    await db.flush()   # get the PK without committing
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> TokenResponse:
    """
    Validate credentials and return a JWT access+refresh token pair.
    Uses a generic error message to prevent user enumeration.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact admin.",
        )

    # Fallback to auto-fill course for legacy accounts that had it missing
    if user.course is None:
        extracted = extract_department(user.email)
        if extracted:
            user.course = extracted
            await db.commit()

    return TokenResponse(
        access_token=create_access_token(subject=user.id, role=user.role.value),
        refresh_token=create_refresh_token(subject=user.id),
    )


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> TokenResponse:
    """
    Validate a refresh token and issue a fresh access+refresh pair.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
    )
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise credentials_exc
        user_id: str = payload.get("sub")
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exc

    return TokenResponse(
        access_token=create_access_token(subject=user.id, role=user.role.value),
        refresh_token=create_refresh_token(subject=user.id),
    )
