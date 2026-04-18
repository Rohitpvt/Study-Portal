import sqlite3
import os
import uuid

def inject():
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    
    # Material content with unique secret code
    title = "Verification Guide"
    content = "The secret code for this platform is ALPHA-ZULU-99. This is documented in the official Verification Guide. Page 1."
    test_file = "verification_test.txt"
    
    with open(test_file, "w") as f:
        f.write(content)
        
    # Get a valid user ID
    cursor.execute('SELECT id FROM users LIMIT 1')
    user_id = cursor.fetchone()[0]
    
    # Check if exists, delete if so to ensure fresh start
    cursor.execute("DELETE FROM materials WHERE title = ?", (title,))
    
    mat_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO materials (id, title, description, subject, course, semester, category, file_path, file_name, file_size, file_type, is_approved, uploader_id, view_count, download_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (mat_id, title, "Deterministic Test Doc", "QA", "Testing", 1, "SYLLABUS", test_file, test_file, os.path.getsize(test_file), "text/plain", 1, user_id, 0, 0))
    
    conn.commit()
    conn.close()
    print(f"Material '{title}' (ID: {mat_id}) injected successfully under uploader {user_id}.")

if __name__ == "__main__":
    inject()
