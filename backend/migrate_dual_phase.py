"""Migration script to add dual_phase columns to specialists table."""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'loan_workflow.db')

def migrate():
    """Add dual_phase and dual_phases columns to specialists table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if columns already exist
    cursor.execute("PRAGMA table_info(specialists)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'dual_phase' not in columns:
        print("Adding dual_phase column...")
        cursor.execute("ALTER TABLE specialists ADD COLUMN dual_phase BOOLEAN DEFAULT 0")
        print("Added dual_phase column")
    else:
        print("dual_phase column already exists")

    if 'dual_phases' not in columns:
        print("Adding dual_phases column...")
        cursor.execute("ALTER TABLE specialists ADD COLUMN dual_phases TEXT DEFAULT '[]'")
        print("Added dual_phases column")
    else:
        print("dual_phases column already exists")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
