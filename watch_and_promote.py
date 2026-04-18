import sqlite3
import time
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "christ_uni_dev.db")

print("Sentinel active: Watching for superadmin profile registration...")
for i in range(45):
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("UPDATE users SET role='admin' WHERE email='superadmin@christuniversity.in'")
        if c.rowcount > 0:
            print("Intercepted and Promoted superadmin@christuniversity.in to ADMIN!")
        conn.commit()
        conn.close()
    except Exception as e:
        pass
    time.sleep(1)
print("Sentinel terminated.")
