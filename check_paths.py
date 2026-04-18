import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
cursor = conn.cursor()
try:
    cursor.execute("SELECT title, file_path FROM materials LIMIT 10;")
    rows = cursor.fetchall()
    for row in rows:
        print(f"Title: {row[0]}, Path: {row[1]}")
except Exception as e:
    print("Error:", e)
conn.close()
