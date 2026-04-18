import sqlite3
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import hash_password

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "christ_uni_dev.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

new_hash = hash_password("AdminPass1!")

c.execute("UPDATE users SET role='admin', hashed_password=? WHERE email='admin@christuniversity.in'", (new_hash,))

if c.rowcount > 0:
    print("SUCCESS: Forcibly promoted admin@christuniversity.in to ADMIN and reset password natively.")
else:
    print("FAILED: Record not found.")

conn.commit()
conn.close()
