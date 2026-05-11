import sqlite3
import os

db_path = 'christ_uni_dev.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create new table with correct schema
    cursor.execute("""
    CREATE TABLE classroom_materials_new (
        id VARCHAR(36) NOT NULL, 
        classroom_id VARCHAR(36) NOT NULL, 
        topic_id VARCHAR(36), 
        material_id VARCHAR(36), 
        added_by VARCHAR(36) NOT NULL, 
        section_type VARCHAR(12) NOT NULL, 
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
        google_drive_file_id VARCHAR(255), 
        google_drive_link TEXT, 
        google_drive_file_name VARCHAR(255), 
        google_drive_mime_type VARCHAR(100), 
        PRIMARY KEY (id), 
        FOREIGN KEY(classroom_id) REFERENCES classrooms (id) ON DELETE CASCADE, 
        FOREIGN KEY(topic_id) REFERENCES classroom_topics (id) ON DELETE SET NULL, 
        FOREIGN KEY(material_id) REFERENCES materials (id) ON DELETE CASCADE, 
        FOREIGN KEY(added_by) REFERENCES users (id)
    )
    """)
    
    # Copy data
    cursor.execute("""
    INSERT INTO classroom_materials_new (
        id, classroom_id, topic_id, material_id, added_by, section_type, 
        created_at, updated_at, google_drive_file_id, google_drive_link, 
        google_drive_file_name, google_drive_mime_type
    )
    SELECT 
        id, classroom_id, topic_id, material_id, added_by, section_type, 
        created_at, updated_at, google_drive_file_id, google_drive_link, 
        google_drive_file_name, google_drive_mime_type
    FROM classroom_materials
    """)
    
    # Drop old table and rename new one
    cursor.execute("DROP TABLE classroom_materials")
    cursor.execute("ALTER TABLE classroom_materials_new RENAME TO classroom_materials")
    
    conn.commit()
    conn.close()
    print("DB fixed manually")
else:
    print(f"DB not found at {db_path}")
