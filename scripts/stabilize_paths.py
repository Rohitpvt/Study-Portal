
import sqlite3
import os
import shutil
import argparse
import logging

# ── Configuration ───────────────────────────────────────────────────────────
DB_PATH = "christ_uni_dev.db"
UPLOAD_BASE = "uploads"
CATEGORIES_DIR = {
    "NOTES": "notes",
    "PREVIOUS_PAPERS": "previous_papers",
    "ASSIGNMENTS": "assignments",
    "REFERENCE": "reference",
    "MISC": "misc"
}

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("stabilizer")

def get_safe_dest(category, filename):
    sub = CATEGORIES_DIR.get(category, "misc")
    return os.path.join(UPLOAD_BASE, sub, filename)

def stabilize(dry_run=True):
    if not os.path.exists(DB_PATH):
        logger.error(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # We need to stabilize both materials and contributions
    tables = [
        ("materials", ["id", "title", "file_path", "category"]),
        ("contributions", ["id", "title", "file_path", "category"])
    ]

    total_updated = 0

    for table_name, cols in tables:
        logger.info(f"--- Scanning table: {table_name} ---")
        c.execute(f"SELECT {', '.join(cols)} FROM {table_name}")
        rows = c.fetchall()

        for row in rows:
            record_id, title, file_path, category = row
            
            if not file_path:
                continue

            # Check if path needs stabilization
            # Normalized for comparison
            norm_path = file_path.replace("\\", "/")
            is_external = ":" in file_path or not norm_path.startswith("uploads")
            
            if is_external:
                logger.info(f"Found external path for [{title}]: {file_path}")
                
                # Source path handling
                src_path = file_path
                if not os.path.isabs(src_path):
                    src_path = os.path.abspath(src_path)
                
                if not os.path.exists(src_path):
                    logger.warning(f"  [!] Source file DOES NOT EXIST: {src_path}")
                    continue

                # Destination path handling
                filename = os.path.basename(file_path)
                dest_rel = get_safe_dest(category, filename)
                dest_abs = os.path.abspath(dest_rel)

                logger.info(f"  [Plan] Copy: {src_path}")
                logger.info(f"  [Plan] To:   {dest_abs}")
                logger.info(f"  [Plan] DB:   Update path to {dest_rel}")

                if not dry_run:
                    try:
                        os.makedirs(os.path.dirname(dest_abs), exist_ok=True)
                        shutil.copy2(src_path, dest_abs)
                        c.execute(f"UPDATE {table_name} SET file_path = ? WHERE id = ?", (dest_rel, record_id))
                        total_updated += 1
                        logger.info(f"  [Success] Record {record_id} stabilized.")
                    except Exception as e:
                        logger.error(f"  [Error] Failed to stabilize record {record_id}: {e}")
            else:
                # Already in uploads, check if we need to fix separators
                if "\\" in file_path:
                    new_path = file_path.replace("\\", "/")
                    logger.info(f"Normalizing internal path for [{title}]: {file_path} -> {new_path}")
                    if not dry_run:
                        c.execute(f"UPDATE {table_name} SET file_path = ? WHERE id = ?", (new_path, record_id))
                        total_updated += 1

    if not dry_run:
        conn.commit()
        logger.info(f"Migration complete. {total_updated} records updated.")
    else:
        logger.info("Dry run complete. No changes made to disk or database.")

    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stabilize database file paths.")
    parser.add_argument("--execute", action="store_true", help="Perform actual file copies and DB updates.")
    args = parser.parse_args()

    stabilize(dry_run=not args.execute)
