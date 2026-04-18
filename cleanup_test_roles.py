import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "christ_uni_dev.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("UPDATE users SET role='student' WHERE email NOT LIKE '%admin%'")
print(f"Demoted {c.rowcount} accidental admin test accounts back to 'student'.")

conn.commit()
conn.close()
