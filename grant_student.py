import asyncio
from app.models.user import Role
from role_manager import grant_role_to_email

if __name__ == "__main__":
    asyncio.run(grant_role_to_email("test.student@mca.christuniversity.in", Role.STUDENT, "Test Student"))
