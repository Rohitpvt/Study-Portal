
import sqlite3
import os

db_path = 'christ_uni_dev.db'
if not os.path.exists(db_path):
    print(f"Database {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Map lowercase values to uppercase keys as expected by SQLAlchemy Enum
mappings = {
    'notes': 'NOTES',
    'previous_papers': 'PREVIOUS_PAPERS',
    'assignments': 'ASSIGNMENTS',
    'reference': 'REFERENCE',
    'misc': 'MISC'
}

changes = 0
for low, high in mappings.items():
    c.execute("UPDATE materials SET category = ? WHERE category = ?", (high, low))
    changes += c.rowcount

conn.commit()
print(f"Fixed {changes} material records.")

# Also check contributions table if it exists and has lowercase
try:
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='contributions'")
    if c.fetchone():
        for low, high in mappings.items():
            c.execute("UPDATE contributions SET category = ? WHERE category = ?", (high, low))
            changes += c.rowcount
        conn.commit()
        print(f"Fixed contributions as well.")
except Exception as e:
    print(f"Error checking contributions: {e}")

conn.close()
