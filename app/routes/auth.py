"""
app/routes/auth.py
───────────────────
Authentication endpoints: register, login, token refresh.
"""

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies import DBSession
from app.schemas.auth import RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    summary="Register a new student account",
)
async def register(payload: RegisterRequest, db: DBSession):
    """
    Register with a valid @christuniversity.in email.
    Returns the created user profile.
    """
    user = await auth_service.register_user(payload, db)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive JWT tokens",
)
async def login(
    db: DBSession,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    OAuth2 form login (username = email).
    Compatible with Swagger UI "Authorize" button.
    """
    return await auth_service.authenticate_user(
        email=form_data.username,
        password=form_data.password,
        db=db,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh(payload: RefreshRequest, db: DBSession):
    """Issue a new token pair using a valid refresh token."""
    return await auth_service.refresh_tokens(payload.refresh_token, db)
