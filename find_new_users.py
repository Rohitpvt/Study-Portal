import sqlite3
conn = sqlite3.connect('christ_uni_dev.db')
cursor = conn.cursor()
emails = ["rohit.ghosh@mca.christuniversity.in", "tisha.chhabra@mca.christuniversity.in"]
cursor.execute("SELECT id, email, role FROM users WHERE email IN (?, ?)", emails)
users = cursor.fetchall()
print("Found users:", users)
conn.close()
