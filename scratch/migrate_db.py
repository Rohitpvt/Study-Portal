import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'christ_uni_dev.db')

def migrate():
    print(f"Migrating database safely: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("Database not found. This might mean the DB is yet to be created. Exiting...")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    cols = [col[1] for col in cursor.fetchall()]
    
    
    new_columns = [
        ("avatar_type", "VARCHAR(20) DEFAULT 'preset'"),
        ("avatar_url", "VARCHAR(500)"),
        ("bio", "VARCHAR(300)"),
        ("course", "VARCHAR(100)"),
        ("last_seen", "INTEGER")
    ]
    
    for col_name, col_def in new_columns:
        if col_name not in cols:
            print(f"Adding '{col_name}' column...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def};")
        else:
            print(f"'{col_name}' already exists.")
            
    conn.commit()
    conn.close()
    print("Migration successful.")

if __name__ == "__main__":
    migrate()
