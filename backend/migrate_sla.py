"""Migration script to add SLA columns to workflow definitions."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "loan_workflow.db")


def migrate():
    """Add sla_hours column to workflow_task_definitions and subtask_definitions."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if sla_hours column exists in workflow_task_definitions
        cursor.execute("PRAGMA table_info(workflow_task_definitions)")
        columns = [col[1] for col in cursor.fetchall()]

        if "sla_hours" not in columns:
            print("Adding sla_hours column to workflow_task_definitions...")
            cursor.execute(
                "ALTER TABLE workflow_task_definitions ADD COLUMN sla_hours REAL"
            )
            print("Done!")
        else:
            print("sla_hours column already exists in workflow_task_definitions")

        # Check if sla_hours column exists in subtask_definitions
        cursor.execute("PRAGMA table_info(subtask_definitions)")
        columns = [col[1] for col in cursor.fetchall()]

        if "sla_hours" not in columns:
            print("Adding sla_hours column to subtask_definitions...")
            cursor.execute(
                "ALTER TABLE subtask_definitions ADD COLUMN sla_hours REAL"
            )
            print("Done!")
        else:
            print("sla_hours column already exists in subtask_definitions")

        conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
