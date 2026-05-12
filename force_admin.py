import sqlite3
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import hash_password

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "christ_uni_dev.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

password = os.getenv("ADMIN_TEST_PASSWORD")
if not password:
    raise RuntimeError("ADMIN_TEST_PASSWORD is required for this script")
    
admin_email = os.getenv("ADMIN_TEST_EMAIL", "admin_demo@christuniversity.in")

new_hash = hash_password(password)

c.execute("UPDATE users SET role='admin', hashed_password=? WHERE email=?", (new_hash, admin_email))

if c.rowcount > 0:
    print(f"SUCCESS: Forcibly promoted {admin_email} to ADMIN and reset password natively.")
else:
    print("FAILED: Record not found.")

conn.commit()
conn.close()
