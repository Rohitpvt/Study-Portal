import os
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password

async def grant_role_to_email(email: str, role: Role, name: str = "Test User"):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        password = os.getenv("ADMIN_TEST_PASSWORD", "dummy")
        
        if user:
            user.role = role
            user.hashed_password = hash_password(password)
            await db.commit()
            print(f"SUCCESS: Promoted existing account '{email}' to {role.value}.")
        else:
            new_user = User(
                id=str(uuid.uuid4()),
                email=email,
                full_name=name,
                hashed_password=hash_password(password),
                role=role,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print(f"SUCCESS: Created new {role.value} account for '{email}'. Password: (via ENV)")
