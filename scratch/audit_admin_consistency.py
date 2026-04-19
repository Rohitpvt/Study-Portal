import sqlite3

def check_admins():
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    
    # Check what roles actually exist in the DB first
    cursor.execute("SELECT Distinct role FROM users")
    roles = cursor.fetchall()
    print(f"Roles found in DB: {roles}")

    print("\n--- Users with role 'admin' (case-insensitive search) ---")
    cursor.execute("SELECT id, email, full_name, role, is_active FROM users WHERE lower(role) = 'admin'")
    rows = cursor.fetchall()
    for r in rows:
        print(r)
        
    print("\n--- Status of 'rohit.ghosh@mca.christuniversity.in' ---")
    cursor.execute("SELECT id, email, full_name, role, is_active FROM users WHERE email = 'rohit.ghosh@mca.christuniversity.in'")
    rohit = cursor.fetchone()
    print(rohit if rohit else "Not found")
    
    conn.close()

if __name__ == "__main__":
    check_admins()
