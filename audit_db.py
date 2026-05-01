import sqlite3
import json

db_path = "christ_uni_dev.db"

def analyze_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
    
    report = {}
    
    for table in tables:
        # Get columns
        cursor.execute(f"PRAGMA table_info({table});")
        columns = cursor.fetchall()
        
        # Get foreign keys
        cursor.execute(f"PRAGMA foreign_key_list({table});")
        fks = cursor.fetchall()
        fk_columns = [fk[3] for fk in fks]
        
        # Get indexes
        cursor.execute(f"PRAGMA index_list({table});")
        indexes = cursor.fetchall()
        
        indexed_columns = set()
        for idx in indexes:
            idx_name = idx[1]
            cursor.execute(f"PRAGMA index_info({idx_name});")
            idx_cols = cursor.fetchall()
            for c in idx_cols:
                indexed_columns.add(c[2])
                
        # Find missing indexes (FKs that are not indexed)
        missing_fk_indexes = [col for col in fk_columns if col not in indexed_columns]
        
        # Count rows
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        row_count = cursor.fetchone()[0]
        
        report[table] = {
            "row_count": row_count,
            "columns": len(columns),
            "foreign_keys": fk_columns,
            "indexed_columns": list(indexed_columns),
            "missing_fk_indexes": missing_fk_indexes
        }
        
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    analyze_db()
