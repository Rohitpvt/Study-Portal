import sqlite3
import os

db_path = "christ_uni_dev.db"

if os.path.exists(db_path):
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Checking for 'status' column in 'contact_submissions'...")
        cursor.execute("PRAGMA table_info(contact_submissions)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "status" not in columns:
            print("Adding 'status' column...")
            cursor.execute("ALTER TABLE contact_submissions ADD COLUMN status VARCHAR(20) DEFAULT 'new'")
            conn.commit()
            print("Column 'status' added successfully.")
        else:
            print("Column 'status' already exists.")
            
    except sqlite3.OperationalError as e:
        print(f"Operational error: {e}")
        # Table might not exist yet if lifespan hasn't run
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database {db_path} not found.")
