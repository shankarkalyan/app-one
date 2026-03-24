"""Quick migration script to allow NULL specialty_type, create allocation_history table, and add ssn_last_four column."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "loan_workflow.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found. It will be created when you start the server.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if ssn_last_four column exists in loan_applications
    cursor.execute("PRAGMA table_info(loan_applications)")
    columns = [c[1] for c in cursor.fetchall()]
    if 'ssn_last_four' not in columns:
        print("Adding ssn_last_four column to loan_applications...")
        cursor.execute("ALTER TABLE loan_applications ADD COLUMN ssn_last_four VARCHAR(4)")
        print("ssn_last_four column added.")
    else:
        print("ssn_last_four column already exists.")

    # Check if allocation_history table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='allocation_history'")
    if not cursor.fetchone():
        print("Creating allocation_history table...")
        cursor.execute('''
            CREATE TABLE allocation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type VARCHAR(50) NOT NULL,
                specialist_id INTEGER NOT NULL,
                specialist_name VARCHAR(200),
                from_phase VARCHAR(50),
                to_phase VARCHAR(50),
                task_id INTEGER,
                application_id VARCHAR(50),
                from_specialist_id INTEGER,
                from_specialist_name VARCHAR(200),
                to_specialist_id INTEGER,
                to_specialist_name VARCHAR(200),
                reason VARCHAR(100),
                reason_details TEXT,
                performed_by_id INTEGER,
                performed_by_name VARCHAR(200),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (specialist_id) REFERENCES specialists(id),
                FOREIGN KEY (task_id) REFERENCES specialist_tasks(id),
                FOREIGN KEY (performed_by_id) REFERENCES specialists(id)
            )
        ''')
        print("allocation_history table created.")
    else:
        print("allocation_history table already exists.")

    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # But first check if specialty_type already allows NULL
    cursor.execute("PRAGMA table_info(specialists)")
    columns = cursor.fetchall()
    specialty_col = next((c for c in columns if c[1] == 'specialty_type'), None)

    if specialty_col and specialty_col[3] == 1:  # notnull = 1 means NOT NULL
        print("Migrating specialists table to allow NULL specialty_type...")

        # Get all data
        cursor.execute("SELECT * FROM specialists")
        rows = cursor.fetchall()
        col_names = [desc[0] for desc in cursor.description]

        # Rename old table
        cursor.execute("ALTER TABLE specialists RENAME TO specialists_old")

        # Create new table with nullable specialty_type
        cursor.execute('''
            CREATE TABLE specialists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(200) NOT NULL,
                email VARCHAR(200),
                specialty_type VARCHAR(50),
                role VARCHAR(50) DEFAULT 'specialist',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login_at DATETIME
            )
        ''')

        # Copy data
        for row in rows:
            placeholders = ','.join(['?' for _ in row])
            cursor.execute(f"INSERT INTO specialists VALUES ({placeholders})", row)

        # Drop old table
        cursor.execute("DROP TABLE specialists_old")
        print("specialists table migrated successfully.")
    else:
        print("specialists table already allows NULL specialty_type.")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
