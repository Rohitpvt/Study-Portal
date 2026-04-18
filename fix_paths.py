import sqlite3
import os

conn = sqlite3.connect('christ_uni_dev.db')
cursor = conn.cursor()
try:
    cursor.execute("SELECT id, title, file_path FROM materials;")
    rows = cursor.fetchall()
    for row in rows:
        mat_id, title, path = row
        print(f"ID: {mat_id}, Title: {title}, Path: {path}")
        # If the path is absolute and doesn't exist, try to make it relative
        if os.path.isabs(path) and not os.path.exists(path):
            # Try to find the file in the current uploads directory
            filename = os.path.basename(path)
            # Find the file recursively in uploads/
            found = False
            for root, dirs, files in os.walk("uploads"):
                if filename in files:
                    new_path = os.path.join(root, filename)
                    cursor.execute("UPDATE materials SET file_path = ? WHERE id = ?", (new_path, mat_id))
                    print(f"  -> Updated to: {new_path}")
                    found = True
                    break
            if not found:
                print(f"  !! File NOT found in uploads/ folder: {filename}")
    conn.commit()
except Exception as e:
    print("Error:", e)
conn.close()
