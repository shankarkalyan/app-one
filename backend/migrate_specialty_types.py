"""Migration script to add specialty_types column to specialists table."""
import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "loan_workflow.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found. It will be created when you start the server.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if specialty_types column exists
    cursor.execute("PRAGMA table_info(specialists)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'specialty_types' not in columns:
        print("Adding specialty_types column to specialists table...")
        cursor.execute('ALTER TABLE specialists ADD COLUMN specialty_types TEXT DEFAULT "[]"')

        # Migrate existing specialty_type data to specialty_types
        cursor.execute("SELECT id, specialty_type FROM specialists")
        specialists = cursor.fetchall()

        for spec_id, specialty_type in specialists:
            if specialty_type and specialty_type != "NOT_ALLOCATED":
                specialty_types = json.dumps([specialty_type])
            else:
                specialty_types = json.dumps([])

            cursor.execute(
                "UPDATE specialists SET specialty_types = ? WHERE id = ?",
                (specialty_types, spec_id)
            )

        print(f"Migrated {len(specialists)} specialists to use specialty_types.")
    else:
        print("specialty_types column already exists.")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
