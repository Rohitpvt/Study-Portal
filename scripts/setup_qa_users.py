import sqlite3
import uuid
import bcrypt

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode('utf-8'), salt).decode('utf-8')

def setup_qa_users():
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    
    password = "QAPass123!"
    hashed = hash_password(password)
    
    qa_users = [
        ("qa.teacher@christuniversity.in", "QA Teacher", "TEACHER"),
        ("qa.student@mca.christuniversity.in", "QA Student", "STUDENT"),
        ("qa.stranger@mca.christuniversity.in", "QA Stranger", "STUDENT")
    ]
    
    for email, name, role in qa_users:
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            print(f"QA User {email} already exists.")
            cursor.execute("UPDATE users SET role = ?, hashed_password = ? WHERE email = ?", (role, hashed, email))
        else:
            print(f"Creating QA User {email}...")
            cursor.execute("""
                INSERT INTO users (id, email, full_name, hashed_password, role, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (str(uuid.uuid4()), email, name, hashed, role))
            
    conn.commit()
    conn.close()
    print("QA Users ready.")

if __name__ == "__main__":
    setup_qa_users()
