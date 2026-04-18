import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
cursor = conn.cursor()
cursor.execute('SELECT title, is_approved, file_path FROM materials')
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
