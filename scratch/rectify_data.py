import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.utils.email_validator import COURSE_MAP

# Extended map for case-insensitive cleanup
CLEANUP_MAP = {
    "mca": "MCA (Master of Computer Applications)",
    "bca": "BCA (Bachelor of Computer Applications)",
    "ds":  "BSc Data Science & AI",
    "ems": "BSc EMS (Economics, Maths, Stats)",
    "datascience": "MSc Data Science",
    "mscds": "MSc Data Science",
    "bs": "BSc Data Science & AI", # Map BS to something sensible or leave as is
}

async def rectify():
    async with AsyncSessionLocal() as db:
        print("🚀 Starting Data Rectification...")
        
        # 1. Update Users
        for short, full in CLEANUP_MAP.items():
            res = await db.execute(
                text("UPDATE users SET course = :full WHERE LOWER(course) = :short"),
                {"full": full, "short": short.lower()}
            )
            print(f"  [Users] Converted {res.rowcount} rows from '{short}' to '{full}'")
            
        # 2. Update Materials
        for short, full in CLEANUP_MAP.items():
            res = await db.execute(
                text("UPDATE materials SET course = :full WHERE LOWER(course) = :short"),
                {"full": full, "short": short.lower()}
            )
            print(f"  [Materials] Converted {res.rowcount} rows from '{short}' to '{full}'")
            
        await db.commit()
        print("✅ Data Rectification Complete.")

if __name__ == "__main__":
    asyncio.run(rectify())
