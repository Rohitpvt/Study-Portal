import asyncio
import sys
import os
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

# Add project root to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password
from app.utils.email_validator import extract_department

async def reset_and_seed():
    # SAFETY CHECK
    if "--force" not in sys.argv:
        print("\n" + "!"*60)
        print("CRITICAL WARNING: This script will DELETE ALL USERS in the database.")
        print("To proceed, you MUST run this script with the --force flag.")
        print("Example: python scratch/reset_and_seed_auth.py --force")
        print("!"*60 + "\n")
        return

    print("--- Starting Database Reset & Seeding ---")
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. Delete all existing users
            print("Deleting all existing users...")
            await session.execute(delete(User))
            
            # 2. Seed Admin
            print("Seeding Admin: rohit.ghosh@mca.christuniversity.in")
            admin = User(
                email="rohit.ghosh@mca.christuniversity.in",
                full_name="Rohit Ghosh (Admin)",
                hashed_password=hash_password("admin123"),
                role=Role.ADMIN,
                department=extract_department("rohit.ghosh@mca.christuniversity.in"),
                is_active=True
            )
            session.add(admin)
            
            # 3. Seed Student
            print("Seeding Student: test.student@mca.christuniversity.in")
            student = User(
                email="test.student@mca.christuniversity.in",
                full_name="Test Student",
                hashed_password=hash_password("student123"),
                role=Role.STUDENT,
                department=extract_department("test.student@mca.christuniversity.in"),
                is_active=True
            )
            session.add(student)
            
            await session.commit()
            print("Successfully reset and seeded the database.")
            
        except Exception as e:
            await session.rollback()
            print(f"ERROR: Failed to reset/seed database: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(reset_and_seed())
