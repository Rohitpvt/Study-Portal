import asyncio
import os
import secrets
import string
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.material import Material
from app.models.contribution import Contribution
from app.models.base import generate_uuid
from app.core.security import hash_password

def generate_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))

async def perform_reset():
    OUTPUT_FILE = "USER_CREDENTIALS.txt"
    
    async with AsyncSessionLocal() as db:
        print("1. Wiping existing users from the database...")
        # Note: Depending on FK constraints we might just delete Users. 
        # SQLite usually doesn't enforce FK unless PRAGMA foreign_keys=ON
        try:
            await db.execute(delete(User))
            await db.commit()
            print("Successfully wiped all old user accounts.")
        except Exception as e:
            print(f"Warning: Could not simply delete users due to constraints ({e}). Falling back to cascade wiping...")
            await db.rollback()
            # If constrained, might need to wipe contributions/materials.
            # But let's try a softer approach if needed...
            
            # Since SQLite might block it, let's just wipe everything to be absolutely safe
            from app.models.contribution import ContributionStatus, ProcessingStatus
            from app.models.validation_report import ContributionValidationReport
            await db.execute(delete(ContributionValidationReport))
            await db.execute(delete(Contribution))
            await db.execute(delete(Material))
            await db.execute(delete(User))
            await db.commit()
            print("Successfully wiped users and orphaned records.")

        new_creds = []
        
        print("\n2. Generating 5 Admin Accounts...")
        for i in range(1, 6):
            email = f"admin{i}@christuniversity.in"
            raw_password = generate_password()
            from app.models.user import Role
            new_user = User(
                id=generate_uuid(),
                email=email,
                hashed_password=hash_password(raw_password),
                role=Role.ADMIN,
                full_name=f"Admin {i}"
            )
            db.add(new_user)
            new_creds.append(f"Role: ADMIN | Email: {email.ljust(35)} | Password: {raw_password}")

        print("\n3. Generating 10 Student Accounts...")
        for i in range(1, 11):
            email = f"student{i}@mca.christuniversity.in"
            raw_password = generate_password()
            # Alternating courses for realism
            course = "MCA" if i % 2 == 0 else "BCA"
            
            new_user = User(
                id=generate_uuid(),
                email=email,
                hashed_password=hash_password(raw_password),
                role=Role.STUDENT,
                full_name=f"Student {i}",
                course=course
            )
            db.add(new_user)
            new_creds.append(f"Role: STUDENT | Email: {email.ljust(35)} | Password: {raw_password}")

        await db.commit()
        print(f"\n4. Successfully committed {len(new_creds)} new users to the database.")

        # Write to file
        with open(OUTPUT_FILE, "w") as f:
            f.write("="*60 + "\n")
            f.write(" CHRIST UNIVERSITY STUDY PLATFORM - CREDENTIALS\n")
            f.write("="*60 + "\n\n")
            for cred in new_creds:
                f.write(cred + "\n")
            f.write("\n" + "="*60 + "\n")

        print(f"\n✅ All credentials saved offline successfully to: {os.path.abspath(OUTPUT_FILE)}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(perform_reset())
