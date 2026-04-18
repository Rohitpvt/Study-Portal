
import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
c = conn.cursor()
c.execute("SELECT id, title, category FROM materials")
rows = c.fetchall()
for row in rows:
    print(f"ID: {row[0]}, Title: {row[1]}, Category: [{row[2]}]")
conn.close()
