import os
import faiss
import pickle
import json
import sqlite3
from app.models.material import MaterialIntegrityStatus

faiss_dir = "faiss_index"
index_path = os.path.join(faiss_dir, "index.faiss")
meta_path = os.path.join(faiss_dir, "metadata.pkl")
db_path = "christ_uni_dev.db"

def audit_faiss():
    report = {
        "exists": False,
        "total_vectors": 0,
        "metadata_records": 0,
        "unique_materials_indexed": 0,
        "materials_in_db": 0,
        "orphaned_chunks": 0,
        "health": "UNKNOWN"
    }
    
    # Check DB
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # Use 'available' string for the enum match in sqlite
        cursor.execute("SELECT COUNT(*) FROM materials WHERE is_approved = 1")
        report["materials_in_db"] = cursor.fetchone()[0]
    except Exception as e:
        report["db_error"] = str(e)
        
    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        report["health"] = "MISSING_FILES"
        print(json.dumps(report, indent=2))
        return
        
    report["exists"] = True
    
    try:
        index = faiss.read_index(index_path)
        report["total_vectors"] = index.ntotal
        
        with open(meta_path, "rb") as f:
            metadata = pickle.load(f)
            
        report["metadata_records"] = len(metadata)
        
        # Check uniqueness
        unique_mat_ids = set()
        for chunk in metadata.values():
            if "material_id" in chunk:
                unique_mat_ids.add(chunk["material_id"])
                
        report["unique_materials_indexed"] = len(unique_mat_ids)
        
        # Check orphaned (in index but not in DB)
        cursor.execute("SELECT id FROM materials")
        db_mat_ids = set(row[0] for row in cursor.fetchall())
        
        orphans = unique_mat_ids - db_mat_ids
        report["orphaned_chunks"] = len([m for m in metadata.values() if isinstance(m, dict) and m.get("material_id") in orphans])
        
        if report["total_vectors"] != report["metadata_records"]:
            report["health"] = "CORRUPTED (Vector/Metadata mismatch)"
        elif report["orphaned_chunks"] > 0:
            report["health"] = "STALE (Contains deleted materials)"
        else:
            report["health"] = "HEALTHY"
            
    except Exception as e:
        report["error"] = str(e)
        report["health"] = "ERROR"
        
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    audit_faiss()
