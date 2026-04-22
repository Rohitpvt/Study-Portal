import sqlite3
import uuid
import os
from datetime import datetime

def inject_failed():
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    
    # Get a valid user ID (student)
    cursor.execute("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1")
    user_row = cursor.fetchone()
    if not user_row:
        # fallback to any user
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_row = cursor.fetchone()
        
    user_id = user_row[0]
    
    contribution_id = str(uuid.uuid4())
    title = "FAILED TEST DOCUMENT"
    
    # Statuses
    # ContributionStatus.PENDING = 'pending'
    # ProcessingStatus.PROCESSING_FAILED = 'processing_failed'
    
    cursor.execute("""
        INSERT INTO contributions (
            id, title, description, subject, course, semester, category, 
            file_name, file_size, file_type, status, processing_status, 
            contributor_id, created_at, updated_at, file_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        contribution_id, title, "This submission failed processing.", "Testing", "BCA", 1, "NOTES", 
        "failed_doc.pdf", 1024, "application/pdf", "pending", "processing_failed", 
        user_id, datetime.now().isoformat(), datetime.now().isoformat(), "/fake/path/failed_doc.pdf"
    ))
    
    conn.commit()
    conn.close()
    print(f"Failed contribution '{title}' (ID: {contribution_id}) injected for user {user_id}.")

if __name__ == "__main__":
    inject_failed()
