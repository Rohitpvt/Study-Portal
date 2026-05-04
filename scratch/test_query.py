import asyncio
from sqlalchemy import select
from app.core.database import engine, AsyncSessionLocal
from app.models.classroom import Classroom, ClassroomAnnouncement
from app.models.user import User

async def find_classroom():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Classroom).limit(1))
        classroom = result.scalar_one_or_none()
        if not classroom:
            print("No classrooms found in DB.")
            return
        
        print(f"Found Classroom: {classroom.name} (ID: {classroom.id})")
        
        # Test the query used in the route
        query = (
            select(ClassroomAnnouncement, User.full_name)
            .join(User, ClassroomAnnouncement.created_by == User.id)
            .where(ClassroomAnnouncement.classroom_id == classroom.id)
        )
        res = await db.execute(query)
        print("Query executed successfully.")
        for ann, name in res:
            print(f"Announcement: {ann.title} by {name}")

if __name__ == "__main__":
    asyncio.run(find_classroom())
