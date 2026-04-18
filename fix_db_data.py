import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
cursor = conn.cursor()
try:
    cursor.execute("UPDATE users SET role = UPPER(role);")
    conn.commit()
    print("SUCCESS: Updated roles to uppercase.")
    cursor.execute("SELECT email, role FROM users;")
    print("New Users in DB:", cursor.fetchall())
except Exception as e:
    print("Error:", e)
conn.close()
