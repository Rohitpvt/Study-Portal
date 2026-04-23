import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User, Role
from app.models.material import Material
from app.models.contribution import Contribution
from app.models.chat import ChatSession, ChatMessage
from app.core.security import hash_password
import sqlalchemy as sa

# Use aiosqlite for async sqlite
DATABASE_URL = "sqlite+aiosqlite:///./christ_uni_dev.db"
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def main():
    try:
        async with async_session() as session:
            stmt = sa.select(User).where(User.email == "admin@christuniversity.in")
            result = await session.execute(stmt)
            admin = result.scalar_one_or_none()
            if not admin:
                hashed_pw = hash_password("AdminPass1!")
                new_admin = User(
                    email="admin@christuniversity.in",
                    hashed_password=hashed_pw,
                    full_name="Global System Admin",
                    role=Role.ADMIN,
                    is_active=True
                )
                session.add(new_admin)
                await session.commit()
                print("SUCCESS: Admin 'admin@christuniversity.in' created.")
            else:
                admin.hashed_password = hash_password("AdminPass1!")
                admin.role = Role.ADMIN
                await session.commit()
                print("SUCCESS: Admin 'admin@christuniversity.in' password reset to 'AdminPass1!' and verified as ADMIN.")
    except Exception as e:
        print(f"FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
