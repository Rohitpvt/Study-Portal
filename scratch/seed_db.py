import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import uuid
from datetime import datetime

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_ay8Z9soWwRrg@ep-tiny-resonance-amripcrp.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def seed_data():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. Check if we have the Developer user
            res = await session.execute(text("SELECT id FROM users WHERE email = 'rohit.ghosh@mca.christuniversity.in'"))
            user_id = res.scalar()
            if not user_id:
                print("Developer user not found!")
                return

            print(f"User ID: {user_id}")
            
            # 2. Insert a test contribution
            contrib_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO contributions (id, user_id, title, course, subject, category, status, file_path, file_key, created_at)
                VALUES (:id, :uid, :title, :course, :subject, :category, :status, :path, :key, :now)
            """), {
                "id": contrib_id,
                "uid": user_id,
                "title": "Smoke Test Python Guide",
                "course": "MCA",
                "subject": "Programming in Python",
                "category": "NOTES",
                "status": "APPROVED",
                "path": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                "key": "test/dummy.pdf",
                "now": datetime.utcnow()
            })

            # 3. Insert into materials (the approved library item)
            mat_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO materials (id, contribution_id, title, course, subject, category, file_path, file_key, created_at)
                VALUES (:id, :cid, :title, :course, :subject, :category, :path, :key, :now)
            """), {
                "id": mat_id,
                "cid": contrib_id,
                "title": "Smoke Test Python Guide",
                "course": "MCA",
                "subject": "Programming in Python",
                "category": "NOTES",
                "path": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                "key": "test/dummy.pdf",
                "now": datetime.utcnow()
            })
            
            await session.commit()
            print("Successfully seeded smoke test data!")
            
        except Exception as e:
            await session.rollback()
            print(f"Error seeding data: {e}")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_data())
知识知识知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge知识知识知识知识 knowledge知识 knowledge content knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识知识知识 knowledge知识知识 knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge知识知识 knowledge知识 knowledge知识知识知识知识 knowledge知识 knowledge knowledge知识知识知识 knowledge知识知识 knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识知识 knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge知识知识知识知识知识知识 knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge knowledge知识知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge知识知识知识 knowledge knowledge知识知识知识知识 knowledge知识知识知识知识知识 knowledge knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge knowledge knowledge知识 knowledge knowledge knowledge知识知识知识 knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge知识知识 knowledge知识 knowledge知识知识知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识知识 knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge知识知识知识知识知识知识 knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge knowledge知识知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge知识知识知识 knowledge knowledge知识知识知识知识 knowledge知识知识知识知识知识 knowledge knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识 knowledge知识 knowledge knowledge知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge知识知识 knowledge知识 knowledge知识知识知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识知识知识 knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge知识知识知识知识知识 knowledge知识 knowledge knowledge知识知识知识 knowledge knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge知识知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge知识 knowledge知识 knowledge知识 knowledge knowledge知识 knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识 knowledge knowledge knowledge知识知识 knowledge knowledge knowledge knowledge知识知识知识 knowledge knowledge knowledge knowledge knowledge knowledge知识知识知识 knowledge知识知识知识 knowledge knowledge知识知识知识知识 knowledge知识知识知识知识知识 knowledge knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识知识 knowledge‍"}
知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识知识 knowledge识识识识识识 content知识知识知识知识知识知识知识知识 knowledge识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识知识 knowledg识知识知识知识知识知识知识知识 knowledge识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge知识知识知识知识知识知识知识知识 knowledge knowledge知识知识知识知识知识知识知识‍,Description:
