import os
import sqlite3
import json
import pickle

db_path = "christ_uni_dev.db"
meta_path = "faiss_index/metadata.pkl"

def generate_report():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Load FAISS Metadata to find chunks per material
    chunk_counts = {}
    if os.path.exists(meta_path):
        with open(meta_path, "rb") as f:
            metadata = pickle.load(f)
            # metadata values might be dicts, keys might be ints
            for chunk in metadata.values():
                if isinstance(chunk, dict) and "material_id" in chunk:
                    mat_id = chunk["material_id"]
                    chunk_counts[mat_id] = chunk_counts.get(mat_id, 0) + 1

    # 2. Query DB for materials
    cursor.execute("""
        SELECT id, title, file_key, integrity_status 
        FROM materials
    """)
    materials = cursor.fetchall()
    
    report = []
    
    for m in materials:
        mat_id = m["id"]
        status = m["integrity_status"]
        file_key = m["file_key"]
        
        # Determine Classroom links
        cursor.execute("SELECT classroom_id FROM classroom_materials WHERE material_id = ?", (mat_id,))
        classrooms = [row[0] for row in cursor.fetchall()]
        
        # Determine Assignment links
        cursor.execute("SELECT assignment_id FROM assignment_attachments WHERE material_id = ?", (mat_id,))
        assignments = [row[0] for row in cursor.fetchall()]
        
        # Contribution source (naive check if there's a contribution with same file_key)
        cursor.execute("SELECT id FROM contributions WHERE file_key = ?", (file_key,))
        contrib = cursor.fetchone()
        contrib_id = contrib[0] if contrib else None
        
        chunks = chunk_counts.get(mat_id, 0)
        
        # Determine Action
        action = "UNKNOWN"
        if status == "missing_file":
            if classrooms or assignments:
                action = "RE-UPLOAD REQUIRED (Linked to active classroom/assignment)"
            else:
                action = "DELETE SUGGESTED (Unused test material missing file)"
        elif status == "available" and chunks == 0:
            action = "REINDEX REQUIRED (Healthy file, missing in FAISS)"
        elif status == "available" and chunks > 0:
            action = "HEALTHY"
            
        report.append({
            "material_id": mat_id,
            "title": m["title"],
            "file_key": file_key,
            "integrity_status": status,
            "faiss_chunks": chunks,
            "classroom_links": classrooms,
            "assignment_links": assignments,
            "contribution_source": contrib_id,
            "recommended_action": action
        })
        
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    generate_report()
