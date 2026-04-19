import sqlite3
import os

db_path = 'christ_uni_dev.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
tables = ['users', 'materials', 'contributions']

for table in tables:
    print(f"\n--- Schema for {table} ---")
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        cols = cursor.fetchall()
        for c in cols:
            print(c)
    except Exception as e:
        print(f"Error checking {table}: {e}")
conn.close()
