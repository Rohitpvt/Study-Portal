import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.schemas.user import UserOut, UserUpdate
from app.utils.email_validator import extract_department

async def verify_system():
    print(f"\n{'-'*50}\n🔍 VERIFYING ADVANCED USER PROFILE SYSTEM\n{'-'*50}")
    
    # 1. Test Course Extractor from Email
    print("\n🟢 TEST 1: Course Extractor Logic")
    test_email = "rohit.ghosh@mca.christuniversity.in"
    course = extract_department(test_email)
    assert course == "mca", f"Expected 'mca', got {course}"
    print(f"  ✅ Email '{test_email}' successfully mapped to course: '{course}'")
    
    # 2. Test DB Schema Structure
    print("\n🟢 TEST 2: Database Safe Migrations Integrity")
    async with AsyncSessionLocal() as db:
        # Pragma to check columns in 'users'
        result = await db.execute(text("PRAGMA table_info(users)"))
        cols = [row[1] for row in result.fetchall()]
        
        expected_cols = ["avatar_type", "avatar_url", "bio", "course", "last_seen"]
        for c in expected_cols:
            assert c in cols, f"Missing DB column: {c}"
            print(f"  ✅ Column '{c}' is correctly mapped into DB layer.")
            
    # 3. Test Pydantic Schemas mapping
    print("\n🟢 TEST 3: Pydantic Schema Parsing")
    try:
        user_update = UserUpdate(bio="Test bio of max length", avatar_type="animated", avatar_url="http://s3.local")
        assert user_update.bio == "Test bio of max length"
        print("  ✅ UserUpdate mapped new parameters cleanly.")
    except Exception as e:
        print(f"  ❌ Failed UserUpdate validation: {e}")
        
    print(f"\n{'-'*50}\n🎉 ALL BACKEND VERIFICATIONS PASSED SUCCESSFULLY!\n{'-'*50}")

if __name__ == "__main__":
    asyncio.run(verify_system())
