import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from sqlalchemy import select, update

async def fix_paths():
    async with AsyncSessionLocal() as db:
        # Update the main test file path
        target_path = "uploads/notes/data_comm_notes.pdf"
        
        # Find the material by title
        q = select(Material).where(Material.title == "Data Communication (Imp Notes)")
        res = await db.execute(q)
        material = res.scalar_one_or_none()
        
        if material:
            material.file_path = target_path
            print(f"Updated '{material.title}' to {target_path}")
        else:
            print("Material 'Data Communication (Imp Notes)' not found.")

        # Cleanup the duplicate if it exists or just update it too
        q2 = select(Material).where(Material.title == "Special Char Test (Spaces)")
        res2 = await db.execute(q2)
        material2 = res2.scalar_one_or_none()
        if material2:
            material2.file_path = target_path
            print(f"Updated '{material2.title}' to {target_path}")

        await db.commit()
        print("Database paths updated.")

if __name__ == "__main__":
    asyncio.run(fix_paths())
