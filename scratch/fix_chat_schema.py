import asyncio
import sqlite3
import os

def fix_schema():
    db_path = "./christ_uni_dev.db"
    if not os.path.exists(db_path):
        print(f"Error: Database file {db_path} not found.")
        return

    print(f"--- Fixing Schema in {db_path} ---")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if chat_sessions table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'")
        if not cursor.fetchone():
            print("Table 'chat_sessions' does not exist yet. It will be created by the app on startup.")
            return

        # Check existing columns
        cursor.execute("PRAGMA table_info(chat_sessions)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "last_message_at" not in columns:
            print("Adding 'last_message_at' column to 'chat_sessions'...")
            # SQLite limitation: Adding a NOT NULL column requires a CONSTANT default.
            cursor.execute("ALTER TABLE chat_sessions ADD COLUMN last_message_at DATETIME DEFAULT '2026-01-01 00:00:00' NOT NULL")
            print("Successfully added 'last_message_at' column.")
        else:
            print("'last_message_at' column already exists.")

        # Ensure chat_messages is also correct (mode and sources)
        cursor.execute("PRAGMA table_info(chat_messages)")
        msg_columns = [row[1] for row in cursor.fetchall()]

        if "mode" not in msg_columns:
            print("Adding 'mode' column to 'chat_messages'...")
            cursor.execute("ALTER TABLE chat_messages ADD COLUMN mode VARCHAR(20)")
            print("Successfully added 'mode' column.")

        if "sources" not in msg_columns:
            print("Adding 'sources' column to 'chat_messages'...")
            cursor.execute("ALTER TABLE chat_messages ADD COLUMN sources TEXT")
            print("Successfully added 'sources' column.")

        conn.commit()
        print("--- Schema Correction Complete ---")

    except Exception as e:
        print(f"Error during schema fix: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema()
