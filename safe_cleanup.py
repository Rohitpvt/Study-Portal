import sqlite3

db_path = "christ_uni_dev.db"

def safe_cleanup():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Unlink broken material from assignment (Action B)
    unlink_query = """
        DELETE FROM assignment_attachments
        WHERE material_id = 'dcd37ee4-2254-4ddf-9222-19e504ab6b83'
    """
    cursor.execute(unlink_query)
    print("Unlinked material 'dcd37ee4-2254-4ddf-9222-19e504ab6b83' from assignment.")
    
    # 2. Delete the 3 isolated broken test materials
    broken_materials = [
        '7807e727-2e06-4160-9c51-6106ee171a22',
        '92a27960-8818-4837-b6d0-bc1cb6dab2ac',
        'dcd37ee4-2254-4ddf-9222-19e504ab6b83'
    ]
    
    for mat_id in broken_materials:
        # Extra safety: ensure they are isolated (no links remaining)
        cursor.execute("SELECT COUNT(*) FROM classroom_materials WHERE material_id=?", (mat_id,))
        cm_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM assignment_attachments WHERE material_id=?", (mat_id,))
        aa_count = cursor.fetchone()[0]
        
        if cm_count == 0 and aa_count == 0:
            cursor.execute("DELETE FROM materials WHERE id=?", (mat_id,))
            print(f"Deleted isolated broken material: {mat_id}")
        else:
            print(f"WARNING: Material {mat_id} is NOT isolated! cm={cm_count}, aa={aa_count}")
            
    conn.commit()

if __name__ == "__main__":
    safe_cleanup()
