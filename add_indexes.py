import sqlite3

db_path = "christ_uni_dev.db"

def add_indexes():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Safe non-destructive indexes for foreign keys to prevent N+1 and slow queries
    indexes_to_add = [
        # materials
        "CREATE INDEX IF NOT EXISTS idx_materials_uploader ON materials(uploader_id);",
        # contributions
        "CREATE INDEX IF NOT EXISTS idx_contributions_contributor ON contributions(contributor_id);",
        # classrooms
        "CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(created_by_teacher_id);",
        # classroom_topics
        "CREATE INDEX IF NOT EXISTS idx_classroom_topics_classroom ON classroom_topics(classroom_id);",
        # classroom_materials
        "CREATE INDEX IF NOT EXISTS idx_cm_classroom ON classroom_materials(classroom_id);",
        "CREATE INDEX IF NOT EXISTS idx_cm_topic ON classroom_materials(topic_id);",
        "CREATE INDEX IF NOT EXISTS idx_cm_material ON classroom_materials(material_id);",
        # classroom_announcements
        "CREATE INDEX IF NOT EXISTS idx_ca_classroom ON classroom_announcements(classroom_id);",
        # classroom_assignments
        "CREATE INDEX IF NOT EXISTS idx_cassign_classroom ON classroom_assignments(classroom_id);",
        # assignment_attachments
        "CREATE INDEX IF NOT EXISTS idx_aa_assignment ON assignment_attachments(assignment_id);",
        "CREATE INDEX IF NOT EXISTS idx_aa_material ON assignment_attachments(material_id);",
        # assignment_submissions
        "CREATE INDEX IF NOT EXISTS idx_as_assignment ON assignment_submissions(assignment_id);",
        "CREATE INDEX IF NOT EXISTS idx_as_student ON assignment_submissions(student_id);",
        # classroom_comments
        "CREATE INDEX IF NOT EXISTS idx_cc_classroom ON classroom_comments(classroom_id);",
        "CREATE INDEX IF NOT EXISTS idx_cc_assignment ON classroom_comments(assignment_id);",
        # notifications
        "CREATE INDEX IF NOT EXISTS idx_notif_classroom ON notifications(classroom_id);",
        "CREATE INDEX IF NOT EXISTS idx_notif_assignment ON notifications(assignment_id);"
    ]
    
    for idx_sql in indexes_to_add:
        try:
            cursor.execute(idx_sql)
            print(f"Executed: {idx_sql}")
        except Exception as e:
            print(f"Error on {idx_sql}: {e}")
            
    conn.commit()
    print("All safe indexes added successfully.")

if __name__ == "__main__":
    add_indexes()
