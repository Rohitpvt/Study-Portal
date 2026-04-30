"""
app/schemas/auth.py
────────────────────
Pydantic schemas for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Payload for POST /auth/register."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    roll_no: str | None = Field(default=None, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field("STUDENT", description="Must be 'STUDENT' or 'TEACHER'")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Only allow public registration as STUDENT or TEACHER."""
        allowed = {"STUDENT", "TEACHER"}
        normalized = v.strip().upper()
        if normalized not in allowed:
            raise ValueError(f"Public registration only allows: {', '.join(sorted(allowed))}")
        return normalized

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        """Enforce at least one uppercase, one digit, one special char."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in v):
            raise ValueError("Password must contain at least one special character.")
        return v


class LoginRequest(BaseModel):
    """
    POST /auth/login — accepts JSON body.
    (OAuth2PasswordRequestForm is also wired for Swagger UI compatibility.)
    """

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Returned after successful login or token refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Payload for POST /auth/refresh."""

    refresh_token: str


class MessageResponse(BaseModel):
    """Generic success message."""

    message: str

class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(..., description="Must be 'login' or 'register'")

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    purpose: str
    otp: str = Field(..., min_length=6, max_length=6)

class LoginInitRequest(BaseModel):
    email: EmailStr
    password: str
