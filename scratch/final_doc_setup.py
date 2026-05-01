import os
import shutil
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.material import Material
from sqlalchemy import select

async def setup():
    # Source and Target paths
    src = r"C:\Users\rghos\OneDrive - Vivekananda Institute of Professional Studies\PROJECTS\AI Study Portal\Temp Notes\Data Communication (Imp Notes).pdf"
    target_dir = r"C:\Users\rghos\OneDrive - Vivekananda Institute of Professional Studies\PROJECTS\AI Study Portal\uploads\notes"
    target_file = os.path.join(target_dir, "data_comm_notes.pdf")
    
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. Copy and rename
    try:
        shutil.copy2(src, target_file)
        print(f"Successfully copied and renamed to: {target_file}")
    except Exception as e:
        print(f"Error copying file: {e}")
        return

    # 2. Update DB
    async with AsyncSessionLocal() as db:
        # Find the material by title
        q = select(Material).where(Material.title == "Data Communication (Imp Notes)")
        res = await db.execute(q)
        material = res.scalar_one_or_none()
        
        target_path = "uploads/notes/data_comm_notes.pdf"
        
        if material:
            material.file_path = target_path
            print(f"Updated Material ID {material.id} path to {target_path}")
        else:
            # Create if not exists (for clean testing)
            from uuid import uuid4
            material = Material(
                id=str(uuid4()),
                title="Data Communication (Imp Notes)",
                file_path=target_path,
                course="Computer Science",
                subject="Data Communication",
                semester="4",
                is_approved=True
            )
            db.add(material)
            print(f"Created new Material entry with path: {target_path}")
            
        await db.commit()
        print("Database setup complete.")

if __name__ == "__main__":
    asyncio.run(setup())
