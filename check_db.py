import sqlite3
import os

db_path = 'christ_uni_dev.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(classroom_materials)")
    cols = cursor.fetchall()
    for col in cols:
        print(col)
    conn.close()
else:
    print(f"DB not found at {db_path}")
