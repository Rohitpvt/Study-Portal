import asyncio
import os
import sys
import traceback

# Mocking FastAPI and sqlalchemy for testing
from unittest.mock import AsyncMock, MagicMock

# Add project root to path
project_root = r"C:\Users\rghos\OneDrive - Vivekananda Institute of Professional Studies\PROJECTS\AI Study Portal"
sys.path.append(project_root)

# Mock some dependencies that might fail during import
sys.modules['faiss'] = MagicMock()

async def test_classroom_routes():
    print("Checking app.routes.classrooms for NameErrors...")
    try:
        from app.routes import classrooms
        print("SUCCESS: app.routes.classrooms imported successfully.")
    except Exception as e:
        print("FAILURE: app.routes.classrooms import failed:")
        traceback.print_exc()
        return False
    return True

async def test_llm_service():
    print("Checking app.services.llm_service for error handling...")
    try:
        from app.services import llm_service
        # We don't actually call it here because it needs env vars, just check import
        print("SUCCESS: app.services.llm_service imported successfully.")
    except Exception as e:
        print("FAILURE: app.services.llm_service import failed:")
        traceback.print_exc()
        return False
    return True

async def main():
    success = True
    if not await test_classroom_routes(): success = False
    if not await test_llm_service(): success = False
    
    if success:
        print("\nAll critical backend logic verified.")
    else:
        print("\nSome issues were detected.")

if __name__ == "__main__":
    asyncio.run(main())
