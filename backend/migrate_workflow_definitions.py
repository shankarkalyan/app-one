"""Migration script to add workflow definition tables."""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'loan_workflow.db')

def migrate():
    """Add workflow definition tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if tables already exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='workflow_task_definitions'")
    if cursor.fetchone():
        print("workflow_task_definitions table already exists")
    else:
        print("Creating workflow_task_definitions table...")
        cursor.execute("""
            CREATE TABLE workflow_task_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                phase_code VARCHAR(50) NOT NULL UNIQUE,
                order_index INTEGER DEFAULT 0,
                color VARCHAR(20) DEFAULT '#0a4b94',
                icon VARCHAR(50),
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES specialists(id)
            )
        """)
        print("Created workflow_task_definitions table")

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='subtask_definitions'")
    if cursor.fetchone():
        print("subtask_definitions table already exists")
    else:
        print("Creating subtask_definitions table...")
        cursor.execute("""
            CREATE TABLE subtask_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                order_index INTEGER DEFAULT 0,
                default_specialist_id INTEGER,
                estimated_duration INTEGER DEFAULT 30,
                is_required BOOLEAN DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES workflow_task_definitions(id),
                FOREIGN KEY (default_specialist_id) REFERENCES specialists(id)
            )
        """)
        print("Created subtask_definitions table")

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='checklist_item_definitions'")
    if cursor.fetchone():
        print("checklist_item_definitions table already exists")
    else:
        print("Creating checklist_item_definitions table...")
        cursor.execute("""
            CREATE TABLE checklist_item_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subtask_id INTEGER NOT NULL,
                name VARCHAR(300) NOT NULL,
                description TEXT,
                order_index INTEGER DEFAULT 0,
                is_required BOOLEAN DEFAULT 1,
                activity_category VARCHAR(100),
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subtask_id) REFERENCES subtask_definitions(id)
            )
        """)
        print("Created checklist_item_definitions table")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")


def seed_default_workflow():
    """Seed default workflow tasks based on SPECIALTY_TYPES."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM workflow_task_definitions")
    if cursor.fetchone()[0] > 0:
        print("Workflow tasks already seeded")
        conn.close()
        return

    print("Seeding default workflow tasks...")

    default_tasks = [
        ("Intake & Eligibility", "INTAKE", "Initial call handling and eligibility verification", "#0a4b94", 0),
        ("Application Processing", "APPLICATION", "Application data collection and validation", "#1a6fc9", 1),
        ("Disclosure", "DISCLOSURE", "Disclosure document preparation and delivery", "#2563eb", 2),
        ("Loan Review", "LOAN_REVIEW", "Comprehensive loan package review", "#7c3aed", 3),
        ("Underwriting", "UNDERWRITING", "Risk assessment and underwriting decision", "#9333ea", 4),
        ("Commitment", "COMMITMENT", "Loan commitment issuance", "#c026d3", 5),
        ("Closing", "CLOSING", "Loan closing coordination", "#db2777", 6),
        ("Post-Closing", "POST_CLOSING", "Post-closing activities and funding", "#e11d48", 7),
    ]

    for name, phase_code, description, color, order_index in default_tasks:
        cursor.execute("""
            INSERT INTO workflow_task_definitions (name, phase_code, description, color, order_index)
            VALUES (?, ?, ?, ?, ?)
        """, (name, phase_code, description, color, order_index))

    # Add default subtasks for Intake
    cursor.execute("SELECT id FROM workflow_task_definitions WHERE phase_code = 'INTAKE'")
    intake_id = cursor.fetchone()[0]

    default_intake_subtasks = [
        ("Call Received", "Incoming call from customer or referral", 0),
        ("Eligibility Check", "Verify customer eligibility for loan assumption", 1),
        ("Initial Documentation", "Collect initial required documents", 2),
    ]

    for name, description, order_index in default_intake_subtasks:
        cursor.execute("""
            INSERT INTO subtask_definitions (task_id, name, description, order_index)
            VALUES (?, ?, ?, ?)
        """, (intake_id, name, description, order_index))

    # Add checklist items for first subtask
    cursor.execute("SELECT id FROM subtask_definitions WHERE task_id = ? AND order_index = 0", (intake_id,))
    call_received_id = cursor.fetchone()[0]

    default_checklist = [
        ("Verify caller identity", "VERIFICATION", 0),
        ("Record call details", "DOCUMENTATION", 1),
        ("Explain loan assumption process", "DOCUMENTATION", 2),
        ("Schedule follow-up if needed", "DOCUMENTATION", 3),
    ]

    for name, category, order_index in default_checklist:
        cursor.execute("""
            INSERT INTO checklist_item_definitions (subtask_id, name, activity_category, order_index)
            VALUES (?, ?, ?, ?)
        """, (call_received_id, name, category, order_index))

    conn.commit()
    conn.close()
    print("Default workflow seeded successfully!")


if __name__ == "__main__":
    migrate()
    seed_default_workflow()
