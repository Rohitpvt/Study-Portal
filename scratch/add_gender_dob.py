import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('christ_uni_dev.db')
        cursor = conn.cursor()
        
        print("Starting migration...")
        
        # Add gender column
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN gender VARCHAR(20)")
            print("Added 'gender' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("'gender' column already exists.")
            else:
                raise e
        
        # Add date_of_birth column
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN date_of_birth DATE")
            print("Added 'date_of_birth' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("'date_of_birth' column already exists.")
            else:
                raise e
        
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate()
