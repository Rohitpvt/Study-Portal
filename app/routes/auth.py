"""
app/routes/auth.py
───────────────────
Authentication endpoints: register, login, token refresh.
"""

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies import DBSession
from app.schemas.auth import RefreshRequest, RegisterRequest, TokenResponse, SendOTPRequest, VerifyOTPRequest, MessageResponse, LoginInitRequest
from app.schemas.user import UserOut
from app.services import auth_service, otp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    summary="Register a new student or teacher account",
)
async def register(payload: RegisterRequest, db: DBSession):
    """
    Register a new account.
    - Students must use a valid @christuniversity.in email.
    - Teachers can use any valid email address.
    Returns the created user profile.
    """
    payload.email = payload.email.lower()
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
        email=form_data.username.lower(),
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

@router.post("/send-otp", response_model=MessageResponse, summary="Send an OTP to an academic email")
async def send_otp(payload: SendOTPRequest, db: DBSession):
    """Generates an OTP (Registration only), saves it uniquely, and dispatches it securely."""
    if payload.purpose != "register":
        # Login OTP is dispatched securely through /login-init
        return MessageResponse(message="System restriction. Please use /login-init for login keys.")
    payload.email = payload.email.lower()
    await otp_service.request_otp_db(db, payload.email, payload.purpose)
    return MessageResponse(message="OTP sent successfully")

@router.post("/resend-otp", response_model=MessageResponse, summary="Invalidate previous OTP and resend")
async def resend_otp(payload: SendOTPRequest, db: DBSession):
    """Resend mechanism that overrides previous unused OTP bounds."""
    # We allow resending for both registering and securely cached logins
    payload.email = payload.email.lower()
    await otp_service.request_otp_db(db, payload.email, payload.purpose)
    return MessageResponse(message="OTP resent successfully")

@router.post("/verify-otp", response_model=MessageResponse, summary="Verify submitted OTP code")
async def verify_otp(payload: VerifyOTPRequest, db: DBSession):
    """Validates the input code against the specific purpose logic and sets verified flags."""
    payload.email = payload.email.lower()
    await otp_service.verify_otp_db(db, payload.email, payload.otp, payload.purpose)
    return MessageResponse(message="OTP verified successfully.")

@router.post("/login-init", response_model=MessageResponse, summary="Verify password and dispatch Login OTP")
async def login_init(payload: LoginInitRequest, db: DBSession):
    """Stage 1 Login: Password matches, send the email OTP payload limit."""
    # Assert password is valid BEFORE we even send an OTP. This blocks enumeration loops.
    payload.email = payload.email.lower()
    user = await auth_service.validate_credentials_only(payload.email, payload.password, db)
    await otp_service.request_otp_db(db, payload.email, "login")
    return MessageResponse(message="Credentials verified. OTP securely dispatched.")
