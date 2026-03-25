"""Quick migration script for database schema updates."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "loan_workflow.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found. It will be created when you start the server.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ============================================
    # 1. Add ssn_last_four to loan_applications
    # ============================================
    cursor.execute("PRAGMA table_info(loan_applications)")
    columns = [c[1] for c in cursor.fetchall()]
    if 'ssn_last_four' not in columns:
        print("Adding ssn_last_four column to loan_applications...")
        cursor.execute("ALTER TABLE loan_applications ADD COLUMN ssn_last_four VARCHAR(4)")
        print("ssn_last_four column added.")
    else:
        print("ssn_last_four column already exists.")

    # ============================================
    # 2. Add new columns to specialists table
    # ============================================
    cursor.execute("PRAGMA table_info(specialists)")
    specialist_columns = [c[1] for c in cursor.fetchall()]

    # Add specialty_types column (JSON list)
    if 'specialty_types' not in specialist_columns:
        print("Adding specialty_types column to specialists...")
        cursor.execute("ALTER TABLE specialists ADD COLUMN specialty_types JSON DEFAULT '[]'")
        print("specialty_types column added.")
    else:
        print("specialty_types column already exists.")

    # Add dual_phase column
    if 'dual_phase' not in specialist_columns:
        print("Adding dual_phase column to specialists...")
        cursor.execute("ALTER TABLE specialists ADD COLUMN dual_phase BOOLEAN DEFAULT 0")
        print("dual_phase column added.")
    else:
        print("dual_phase column already exists.")

    # Add dual_phases column (JSON list)
    if 'dual_phases' not in specialist_columns:
        print("Adding dual_phases column to specialists...")
        cursor.execute("ALTER TABLE specialists ADD COLUMN dual_phases JSON DEFAULT '[]'")
        print("dual_phases column added.")
    else:
        print("dual_phases column already exists.")

    # ============================================
    # 3. Create allocation_history table
    # ============================================
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

    conn.commit()
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
