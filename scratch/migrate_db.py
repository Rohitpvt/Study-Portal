import sqlite3
import os

DB_PATH = "christ_uni_dev.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"Applying migration to {DB_PATH}...")
    try:
        cursor.execute("ALTER TABLE materials ADD COLUMN integrity_status TEXT NOT NULL DEFAULT 'pending';")
        print("Added column: integrity_status")
    except sqlite3.OperationalError as e:
        print(f"Column integrity_status might already exist: {e}")

    try:
        cursor.execute("ALTER TABLE materials ADD COLUMN last_reconciliation_at DATETIME;")
        print("Added column: last_reconciliation_at")
    except sqlite3.OperationalError as e:
        print(f"Column last_reconciliation_at might already exist: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
