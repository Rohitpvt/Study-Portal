import sys
import os

# Add project root to path
project_root = r"C:\Users\rghos\OneDrive - Vivekananda Institute of Professional Studies\PROJECTS\AI Study Portal"
sys.path.append(project_root)

# Mock some dependencies
from unittest.mock import MagicMock
sys.modules['faiss'] = MagicMock()

def check_imports():
    print("Attempting to import app.routes.classrooms...")
    try:
        from app.routes import classrooms
        print("SUCCESS: app.routes.classrooms imported successfully.")
        
        # Check for specifically used models
        from app.models.classroom import ClassroomAnnouncement
        print(f"ClassroomAnnouncement: {ClassroomAnnouncement}")
        
    except Exception as e:
        import traceback
        print("FAILURE: Import failed.")
        traceback.print_exc()

if __name__ == "__main__":
    check_imports()
