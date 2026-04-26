import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import uuid
from datetime import datetime

# Import models
import sys
import os
sys.path.append(os.getcwd())

from app.models.user import User
from app.models.contribution import Contribution, ContributionStatus, Category
from app.models.material import Material, MaterialIntegrityStatus

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_ay8Z9soWwRrg@ep-tiny-resonance-amripcrp.c-5.us-east-1.aws.neon.tech/neondb"

async def run_db_tasks():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch Developer user
            stmt = select(User).where(User.email == 'rohit.ghosh@mca.christuniversity.in')
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                print("Developer user not found!")
                return
            
            # 2. Create Material (This is what shows in the Library)
            mat = Material(
                id=str(uuid.uuid4()),
                uploader_id=user.id,
                title="Smoke Test Python Guide",
                course="MCA",
                subject="Programming in Python",
                category=Category.NOTES,
                file_path="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                file_key="test/dummy.pdf",
                file_name="dummy.pdf",
                file_size=1024,
                file_type="application/pdf",
                integrity_status=MaterialIntegrityStatus.available,
                is_approved=True
            )
            session.add(mat)
            
            await session.commit()
            print("\nSuccessfully seeded smoke test Material!")
            
        except Exception as e:
            await session.rollback()
            print(f"Error: {e}")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_db_tasks())
