import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
cursor = conn.cursor()
try:
    cursor.execute("SELECT email, role FROM users;")
    print("Users in DB:", cursor.fetchall())
except Exception as e:
    print("Error:", e)
conn.close()
