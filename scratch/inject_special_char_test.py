
import sqlite3
import uuid
from datetime import datetime

conn = sqlite3.connect('christ_uni_dev.db')
c = conn.cursor()
mat_id = str(uuid.uuid4())
now = datetime.now().isoformat()

c.execute("""
INSERT INTO materials (id, title, description, subject, course, semester, category, file_path, file_name, file_size, file_type, is_approved, view_count, uploader_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    mat_id, 
    'Special Char Test (Spaces)', 
    'Testing spaces and parentheses in URL encoding',
    'Computer Networks',
    'BCA (Bachelor of Computer Applications)',
    5,
    'NOTES',
    'uploads/notes/Data Communication (Imp Notes).pdf',
    'Data Communication (Imp Notes).pdf',
    334098,
    'application/pdf',
    1,
    0,
    '4ca07d72-886f-477c-a496-e1fca944d182',
    now,
    now
))
conn.commit()
conn.close()
print(f'Injected Special Char Test Material with ID: {mat_id}')
