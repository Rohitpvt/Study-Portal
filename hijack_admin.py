import sqlite3
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import hash_password

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "christ_uni_dev.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

hashed = hash_password("Password123!")

c.execute("UPDATE users SET role='admin', hashed_password=? WHERE email='admin.test@christuniversity.in'", (hashed,))

if c.rowcount > 0:
    print("SUCCESS: Hijacked admin.test@christuniversity.in and forced password to Password123!")
else:
    print("FAILED: user not found")

conn.commit()
conn.close()
