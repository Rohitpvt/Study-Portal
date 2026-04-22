import sqlite3
import os

DB_PATH = "christ_uni_dev.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    tables = ["materials", "contributions"]
    
    for table in tables:
        print(f"Checking table: {table}")
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [column[1] for column in cursor.fetchall()]
        
        new_columns = [
            ("original_file_key", "VARCHAR(512)"),
            ("pdf_file_key", "VARCHAR(512)"),
            ("conversion_status", "VARCHAR(50)")
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding column {col_name} to {table}...")
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")
            else:
                print(f"Column {col_name} already exists in {table}.")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
