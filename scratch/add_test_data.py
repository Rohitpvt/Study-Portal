import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material, Category
from app.models.user import User
from sqlalchemy import select

async def add_test_material():
    async with AsyncSessionLocal() as db:
        # Get any user to be the uploader
        res = await db.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No users found to assign as uploader.")
            return

        # Add a placeholder material
        material = Material(
            title="Introduction to Quantum Mechanics",
            subject="Physics",
            category=Category.NOTES,
            uploader_id=user.id,
            file_name="quantum_intro.pdf",
            file_path="uploads/quantum_intro.pdf",
            file_size=2048,
            file_type="pdf",
            is_approved=True,
            course="Physics 101",
            semester=2
        )
        db.add(material)
        await db.commit()
        print(f"Added test material: {material.title}")

if __name__ == "__main__":
    asyncio.run(add_test_material())
