import sqlite3
import uuid
import bcrypt

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode('utf-8'), salt).decode('utf-8')

def setup():
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    
    import os
    
    password = os.getenv("ADMIN_TEST_PASSWORD")
    if not password:
        raise RuntimeError("ADMIN_TEST_PASSWORD is required for this script")
        
    admin_email = os.getenv("ADMIN_TEST_EMAIL", "admin_demo@christuniversity.in")
    student_email = os.getenv("STUDENT_TEST_EMAIL", "student_demo@christuniversity.in")
        
    hashed = hash_password(password)
    
    accounts = [
        (admin_email, "Admin Demo", "ADMIN"),
        (student_email, "Student Demo", "STUDENT")
    ]
    
    for email, name, role in accounts:
        # Check if exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        
        if row:
            print(f"Updating {email} to {role}...")
            cursor.execute("UPDATE users SET role = ?, full_name = ?, hashed_password = ? WHERE email = ?", 
                          (role, name, hashed, email))
        else:
            print(f"Creating {email} as {role}...")
            user_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO users (id, email, full_name, hashed_password, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, email, name, hashed, role, 1))
            
    conn.commit()
    conn.close()
    print("Demo accounts set up successfully.")

if __name__ == "__main__":
    setup()
