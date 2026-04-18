import sqlite3
import os
import uuid

def finalize():
    db_path = 'christ_uni_dev.db'
    if not os.path.exists(db_path):
        print("DB not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Clean up stale test data
    cursor.execute("DELETE FROM materials WHERE title LIKE '%Verification%'")
    
    # 2. Get a valid user
    cursor.execute('SELECT id FROM users LIMIT 1')
    user_id = cursor.fetchone()[0]
    
    # 3. Create verifiable content
    title = "Academic Attribution Verification"
    content = "The verification code for the Christ University AI Platform is DELTA-SIGMA-99. This unique identifier confirms the RAG pipeline is correctly attribute source materials to the respective documents in the knowledge base."
    file_path = "attribution_verify.txt"
    with open(file_path, "w") as f:
        f.write(content)
        
    # 4. Inject
    mat_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO materials (
            id, title, description, subject, course, semester, category, 
            file_path, file_name, file_size, file_type, 
            is_approved, uploader_id, view_count, download_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        mat_id, title, "Primary test document for source attribution", 
        "Artificial Intelligence", "BCA", 4, "SYLLABUS", 
        file_path, file_path, os.path.getsize(file_path), "text/plain", 
        True, user_id, 0, 0
    ))
    
    conn.commit()
    conn.close()
    print(f"✅ Document '{title}' injected successfully.")

if __name__ == "__main__":
    finalize()
