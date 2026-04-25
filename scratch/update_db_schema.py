import sqlite3
import os

db_path = "C:/Users/rghos/OneDrive - Vivekananda Institute of Professional Studies/PROJECTS/Intel AI Project/christ_uni_dev.db"

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Updating 'materials' table schema...")
    
    # Add repair_suggestion
    try:
        cursor.execute("ALTER TABLE materials ADD COLUMN repair_suggestion VARCHAR(512)")
        print("Added column: repair_suggestion")
    except sqlite3.OperationalError as e:
        print(f"Column 'repair_suggestion' might already exist: {e}")

    # Add last_pipeline_retry_at
    try:
        cursor.execute("ALTER TABLE materials ADD COLUMN last_pipeline_retry_at DATETIME")
        print("Added column: last_pipeline_retry_at")
    except sqlite3.OperationalError as e:
        print(f"Column 'last_pipeline_retry_at' might already exist: {e}")

    # Add pipeline_retry_count
    try:
        cursor.execute("ALTER TABLE materials ADD COLUMN pipeline_retry_count INTEGER DEFAULT 0 NOT NULL")
        print("Added column: pipeline_retry_count")
    except sqlite3.OperationalError as e:
        print(f"Column 'pipeline_retry_count' might already exist: {e}")

    conn.commit()
    print("Database schema updated successfully.")
except Exception as e:
    print(f"Critical Error during migration: {e}")
finally:
    conn.close()
