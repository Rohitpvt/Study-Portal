import sqlite3

def run_migration():
    databases = ["christ_uni_dev.db"]
    for db_name in databases:
        print(f"Migrating {db_name}...")
        try:
            conn = sqlite3.connect(db_name)
            cursor = conn.cursor()
            
            # Add columns to materials
            try:
                cursor.execute("ALTER TABLE materials ADD COLUMN file_key VARCHAR(512)")
                print("Added file_key to materials")
            except Exception as e:
                print("Materials file_key:", e)
                
            try:
                cursor.execute("ALTER TABLE materials ADD COLUMN file_url VARCHAR(1024)")
                print("Added file_url to materials")
            except Exception as e:
                print("Materials file_url:", e)

            # Add columns to contributions
            try:
                cursor.execute("ALTER TABLE contributions ADD COLUMN file_key VARCHAR(512)")
                print("Added file_key to contributions")
            except Exception as e:
                print("Contributions file_key:", e)
                
            try:
                cursor.execute("ALTER TABLE contributions ADD COLUMN file_url VARCHAR(1024)")
                print("Added file_url to contributions")
            except Exception as e:
                print("Contributions file_url:", e)

            conn.commit()
            conn.close()
            print(f"Successfully migrated {db_name}")
        except Exception as e:
            print(f"Error accessing {db_name}: {e}")

if __name__ == "__main__":
    run_migration()
