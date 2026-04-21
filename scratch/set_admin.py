import sqlite3

def run():
    print("Connecting to local database...")
    conn = sqlite3.connect('christ_uni_dev.db')
    cursor = conn.cursor()
    
    # Reset all admins to student
    print("Downgrading all extreme privileges...")
    cursor.execute("UPDATE users SET role = 'student' WHERE role = 'admin'")
    
    # Set proper admin
    print("Promoting rohit.ghosh@mca.christuniversity.in to Admin...")
    cursor.execute("UPDATE users SET role = 'admin' WHERE email = 'rohit.ghosh@mca.christuniversity.in'")
    
    conn.commit()
    conn.close()
    print("Database patching complete.")

if __name__ == "__main__":
    run()
