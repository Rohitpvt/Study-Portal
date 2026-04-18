import asyncio
import os
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.material import Material, Category
from sqlalchemy import select

async def register_test_file():
    async with AsyncSessionLocal() as db:
        # Get a user ID
        res = await db.execute(select(User.id).limit(1))
        user_id = res.scalar()
        if not user_id:
            print("No users found in database. Create one first.")
            return

        file_path = r"uploads/notes/Data Communication (Imp Notes).pdf".replace('\\', '/')
        title = "Data Communication (Imp Notes)"
        
        # Check if already exists
        res = await db.execute(select(Material).where(Material.title == title))
        existing = res.scalar_one_or_none()
        if existing:
            print(f"Material '{title}' already exists.")
            return

        material = Material(
            title=title,
            description="Essential notes for Data Communication course.",
            subject="Data Communication",
            course="BCS",
            semester=4,
            category=Category.NOTES,
            file_path=file_path,
            file_name="Data Communication (Imp Notes).pdf",
            file_size=334098,
            file_type="application/pdf",
            uploader_id=user_id,
            is_approved=True
        )
        db.add(material)
        await db.commit()
        print(f"Registered material: {title}")

if __name__ == "__main__":
    asyncio.run(register_test_file())
