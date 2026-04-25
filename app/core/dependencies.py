"""
app/core/dependencies.py
─────────────────────────
Reusable FastAPI dependencies: DB session, current user, admin guard, developer guard.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import time

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate Bearer token → return authenticated User."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exc
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exc
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated.")
        
    now = int(time.time())
    if not user.last_seen or (now - user.last_seen > 60):
        user.last_seen = now
        await db.commit()
        
    return user


async def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Allow access for ADMIN and DEVELOPER roles (admin-level privilege)."""
    if not current_user.role.is_privileged:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to perform this action")
    return current_user


async def require_developer(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Allow access for DEVELOPER role only."""
    if current_user.role != Role.DEVELOPER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer-level access required.")
    return current_user


async def require_student(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != Role.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to perform this action")
    return current_user


# ── Type aliases used in route signatures ─────────────────────────────────────
CurrentUser   = Annotated[User, Depends(get_current_user)]
AdminUser     = Annotated[User, Depends(require_admin)]
DeveloperUser = Annotated[User, Depends(require_developer)]
StudentUser   = Annotated[User, Depends(require_student)]
DBSession     = Annotated[AsyncSession, Depends(get_db)]
