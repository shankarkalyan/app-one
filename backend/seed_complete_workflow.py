"""Seed complete workflow configuration with all tasks, subtasks, and checklist items."""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'loan_workflow.db')


def clear_workflow_data():
    """Clear existing workflow data to start fresh."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Delete in order due to foreign key constraints
    cursor.execute("DELETE FROM checklist_item_definitions")
    cursor.execute("DELETE FROM subtask_definitions")
    cursor.execute("DELETE FROM workflow_task_definitions")

    conn.commit()
    conn.close()
    print("Cleared existing workflow data")


def seed_complete_workflow():
    """Seed complete workflow with all tasks, subtasks, and checklist items."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ========================================
    # WORKFLOW TASKS (8 phases)
    # ========================================
    tasks = [
        {
            "name": "Intake & Eligibility",
            "phase_code": "INTAKE",
            "description": "Initial call handling, eligibility verification, and case optimization",
            "color": "#0a4b94",
            "order_index": 0,
            "subtasks": [
                {
                    "name": "Call Received",
                    "description": "Handle incoming call from customer or referral source",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Verify caller identity", "VERIFICATION"),
                        ("Confirm contact information", "VERIFICATION"),
                        ("Record call details and purpose", "DOCUMENTATION"),
                        ("Explain loan assumption process overview", "COMMUNICATION"),
                    ]
                },
                {
                    "name": "Eligibility Check",
                    "description": "Verify customer eligibility for loan assumption",
                    "estimated_duration": 20,
                    "checklist": [
                        ("Check loan type eligibility (FHA/VA/USDA)", "VERIFICATION"),
                        ("Verify property occupancy requirements", "VERIFICATION"),
                        ("Review credit requirements", "VERIFICATION"),
                        ("Confirm DTI ratio eligibility", "VERIFICATION"),
                        ("Document eligibility status and reasons", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Case Optimization",
                    "description": "Run case optimizer to determine best processing path",
                    "estimated_duration": 10,
                    "checklist": [
                        ("Run case optimizer analysis", "PROCESSING"),
                        ("Review optimization recommendations", "REVIEW"),
                        ("Document case optimization results", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Initial Documentation",
                    "description": "Collect initial required documents from customer",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Request proof of identity", "DOCUMENTATION"),
                        ("Request income documentation", "DOCUMENTATION"),
                        ("Request property information", "DOCUMENTATION"),
                        ("Schedule follow-up if documents pending", "COMMUNICATION"),
                    ]
                },
            ]
        },
        {
            "name": "Application Processing",
            "phase_code": "APPLICATION",
            "description": "Application preparation, DocuSign delivery, and SLA tracking",
            "color": "#1a6fc9",
            "order_index": 1,
            "subtasks": [
                {
                    "name": "Application Preparation",
                    "description": "Prepare assumption application package",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Complete application form with customer data", "DOCUMENTATION"),
                        ("Verify all required fields are populated", "VERIFICATION"),
                        ("Attach supporting documentation", "DOCUMENTATION"),
                        ("Review application for completeness", "REVIEW"),
                    ]
                },
                {
                    "name": "DocuSign Delivery",
                    "description": "Send application via DocuSign for electronic signature",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Create DocuSign envelope", "PROCESSING"),
                        ("Add all required signers", "PROCESSING"),
                        ("Set signing order and fields", "PROCESSING"),
                        ("Send envelope to customer", "COMMUNICATION"),
                        ("Record envelope ID in system", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Application Tracking",
                    "description": "Track application status and SLA compliance",
                    "estimated_duration": 10,
                    "checklist": [
                        ("Monitor DocuSign status", "PROCESSING"),
                        ("Track SLA days remaining", "COMPLIANCE"),
                        ("Send reminder if approaching deadline", "COMMUNICATION"),
                        ("Document application return date", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Application Return Processing",
                    "description": "Process returned signed application",
                    "estimated_duration": 20,
                    "checklist": [
                        ("Verify all signatures are complete", "VERIFICATION"),
                        ("Validate document integrity", "VERIFICATION"),
                        ("Archive signed application", "DOCUMENTATION"),
                        ("Update application status to returned", "PROCESSING"),
                    ]
                },
            ]
        },
        {
            "name": "Disclosure",
            "phase_code": "DISCLOSURE",
            "description": "Disclosure package preparation and regulatory compliance",
            "color": "#2563eb",
            "order_index": 2,
            "subtasks": [
                {
                    "name": "Disclosure Package Preparation",
                    "description": "Prepare all required disclosure documents",
                    "estimated_duration": 45,
                    "checklist": [
                        ("Generate Loan Estimate (LE)", "DOCUMENTATION"),
                        ("Prepare TRID disclosures", "COMPLIANCE"),
                        ("Include state-specific disclosures", "COMPLIANCE"),
                        ("Add assumption-specific notices", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Compliance Review",
                    "description": "Review disclosures for regulatory compliance",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Verify TRID timing requirements", "COMPLIANCE"),
                        ("Check APR and finance charge accuracy", "VERIFICATION"),
                        ("Validate fee tolerances", "COMPLIANCE"),
                        ("Review for fair lending compliance", "COMPLIANCE"),
                    ]
                },
                {
                    "name": "Disclosure Delivery",
                    "description": "Deliver disclosure package to customer",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Send disclosure package via secure method", "COMMUNICATION"),
                        ("Record delivery date and time", "DOCUMENTATION"),
                        ("Confirm customer receipt", "VERIFICATION"),
                        ("Start cooling-off period tracking", "COMPLIANCE"),
                    ]
                },
            ]
        },
        {
            "name": "Loan Review",
            "phase_code": "LOAN_REVIEW",
            "description": "Document collection, review, and completeness verification",
            "color": "#7c3aed",
            "order_index": 3,
            "subtasks": [
                {
                    "name": "Document Request",
                    "description": "Request additional documents needed for underwriting",
                    "estimated_duration": 20,
                    "checklist": [
                        ("Identify required documents list", "REVIEW"),
                        ("Send document request letter", "COMMUNICATION"),
                        ("Set document submission deadline", "PROCESSING"),
                        ("Track outstanding document requests", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Document Collection",
                    "description": "Collect and organize submitted documents",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Receive and log incoming documents", "DOCUMENTATION"),
                        ("Verify document authenticity", "VERIFICATION"),
                        ("Check document dates and validity", "VERIFICATION"),
                        ("Organize documents by category", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Document Review",
                    "description": "Review all documents for completeness and accuracy",
                    "estimated_duration": 45,
                    "checklist": [
                        ("Review income documentation", "REVIEW"),
                        ("Review asset documentation", "REVIEW"),
                        ("Review property documentation", "REVIEW"),
                        ("Identify any discrepancies", "REVIEW"),
                        ("Document review findings", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Missing Documents Follow-up",
                    "description": "Follow up on any missing or incomplete documents",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Generate missing docs letter", "DOCUMENTATION"),
                        ("Contact customer for missing items", "COMMUNICATION"),
                        ("Track follow-up attempts", "DOCUMENTATION"),
                        ("Escalate if documents not received", "PROCESSING"),
                    ]
                },
            ]
        },
        {
            "name": "Underwriting",
            "phase_code": "UNDERWRITING",
            "description": "Risk assessment, underwriting checklist, and readiness verification",
            "color": "#9333ea",
            "order_index": 4,
            "subtasks": [
                {
                    "name": "Underwriting Assignment",
                    "description": "Assign case to underwriter and prepare file",
                    "estimated_duration": 10,
                    "checklist": [
                        ("Assign underwriter to case", "PROCESSING"),
                        ("Prepare underwriting file", "DOCUMENTATION"),
                        ("Note any special considerations", "DOCUMENTATION"),
                        ("Set underwriting priority", "PROCESSING"),
                    ]
                },
                {
                    "name": "Underwriting Checklist",
                    "description": "Complete underwriting checklist items",
                    "estimated_duration": 60,
                    "checklist": [
                        ("Verify employment and income", "VERIFICATION"),
                        ("Calculate and verify DTI ratios", "VERIFICATION"),
                        ("Review credit report and score", "REVIEW"),
                        ("Verify assets and reserves", "VERIFICATION"),
                        ("Review property appraisal", "REVIEW"),
                        ("Check title and lien status", "VERIFICATION"),
                    ]
                },
                {
                    "name": "Risk Assessment",
                    "description": "Assess overall loan risk and compliance",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Evaluate credit risk factors", "REVIEW"),
                        ("Assess collateral risk", "REVIEW"),
                        ("Review fraud indicators", "COMPLIANCE"),
                        ("Document risk assessment findings", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "Underwriting Readiness",
                    "description": "Verify file is ready for underwriting decision",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Verify all checklist items complete", "VERIFICATION"),
                        ("Confirm no outstanding conditions", "VERIFICATION"),
                        ("Prepare decision recommendation", "DOCUMENTATION"),
                        ("Submit for underwriter decision", "PROCESSING"),
                    ]
                },
            ]
        },
        {
            "name": "Commitment",
            "phase_code": "COMMITMENT",
            "description": "Commitment letter generation and customer review",
            "color": "#c026d3",
            "order_index": 5,
            "subtasks": [
                {
                    "name": "Commitment Letter Generation",
                    "description": "Generate and prepare commitment letter",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Generate commitment letter from template", "DOCUMENTATION"),
                        ("Include all loan terms and conditions", "DOCUMENTATION"),
                        ("Add commitment conditions if any", "DOCUMENTATION"),
                        ("Review letter for accuracy", "REVIEW"),
                    ]
                },
                {
                    "name": "Commitment Delivery",
                    "description": "Deliver commitment letter to customer",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Send commitment letter to customer", "COMMUNICATION"),
                        ("Explain commitment terms and conditions", "COMMUNICATION"),
                        ("Record delivery confirmation", "DOCUMENTATION"),
                        ("Set acceptance deadline", "PROCESSING"),
                    ]
                },
                {
                    "name": "Commitment Review Call",
                    "description": "Schedule and conduct commitment review call",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Assign call agent", "PROCESSING"),
                        ("Schedule review call with customer", "COMMUNICATION"),
                        ("Review commitment terms on call", "COMMUNICATION"),
                        ("Address customer questions", "COMMUNICATION"),
                        ("Document call completion", "DOCUMENTATION"),
                    ]
                },
            ]
        },
        {
            "name": "Closing",
            "phase_code": "CLOSING",
            "description": "Closing packet preparation, title coordination, and loan closing",
            "color": "#db2777",
            "order_index": 6,
            "subtasks": [
                {
                    "name": "Closing Packet Preparation",
                    "description": "Prepare all closing documents",
                    "estimated_duration": 45,
                    "checklist": [
                        ("Generate Closing Disclosure (CD)", "DOCUMENTATION"),
                        ("Prepare assumption agreement", "DOCUMENTATION"),
                        ("Prepare note modification documents", "DOCUMENTATION"),
                        ("Include all required disclosures", "COMPLIANCE"),
                        ("Review packet for completeness", "REVIEW"),
                    ]
                },
                {
                    "name": "Title Coordination",
                    "description": "Coordinate with title agency for closing",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Notify title agency of closing", "COMMUNICATION"),
                        ("Send closing package to title", "DOCUMENTATION"),
                        ("Confirm closing date and time", "COMMUNICATION"),
                        ("Verify title insurance requirements", "VERIFICATION"),
                    ]
                },
                {
                    "name": "Pre-Closing Review",
                    "description": "Final review before closing",
                    "estimated_duration": 20,
                    "checklist": [
                        ("Verify all conditions satisfied", "VERIFICATION"),
                        ("Confirm final figures", "VERIFICATION"),
                        ("Review CD for accuracy", "REVIEW"),
                        ("Obtain final approvals", "APPROVAL"),
                    ]
                },
                {
                    "name": "Closing Execution",
                    "description": "Execute closing and record documents",
                    "estimated_duration": 60,
                    "checklist": [
                        ("Conduct closing meeting", "PROCESSING"),
                        ("Obtain all required signatures", "DOCUMENTATION"),
                        ("Collect closing funds", "PROCESSING"),
                        ("Record assumption documents", "DOCUMENTATION"),
                        ("Confirm successful closing", "VERIFICATION"),
                    ]
                },
            ]
        },
        {
            "name": "Post-Closing",
            "phase_code": "POST_CLOSING",
            "description": "Post-closing review, MSP maintenance, and file completion",
            "color": "#e11d48",
            "order_index": 7,
            "subtasks": [
                {
                    "name": "Closing Review",
                    "description": "Review completed closing documents",
                    "estimated_duration": 30,
                    "checklist": [
                        ("Review all signed documents", "REVIEW"),
                        ("Verify recording information", "VERIFICATION"),
                        ("Check for any post-closing issues", "REVIEW"),
                        ("Document closing review completion", "DOCUMENTATION"),
                    ]
                },
                {
                    "name": "MSP Maintenance",
                    "description": "Update Mortgage Servicing Platform with new borrower",
                    "estimated_duration": 45,
                    "checklist": [
                        ("Update borrower information in MSP", "PROCESSING"),
                        ("Transfer account to new borrower", "PROCESSING"),
                        ("Update payment information", "PROCESSING"),
                        ("Set up new borrower portal access", "PROCESSING"),
                        ("Verify MSP update completion", "VERIFICATION"),
                    ]
                },
                {
                    "name": "Welcome Package",
                    "description": "Send welcome package to new borrower",
                    "estimated_duration": 15,
                    "checklist": [
                        ("Generate welcome letter", "DOCUMENTATION"),
                        ("Include payment instructions", "DOCUMENTATION"),
                        ("Provide customer service contacts", "DOCUMENTATION"),
                        ("Send welcome package", "COMMUNICATION"),
                    ]
                },
                {
                    "name": "File Completion",
                    "description": "Complete and archive loan file",
                    "estimated_duration": 20,
                    "checklist": [
                        ("Compile final loan file", "DOCUMENTATION"),
                        ("Verify all documents present", "VERIFICATION"),
                        ("Archive file per retention policy", "COMPLIANCE"),
                        ("Close case in workflow system", "PROCESSING"),
                    ]
                },
            ]
        },
    ]

    # Insert all tasks, subtasks, and checklist items
    for task in tasks:
        # Insert task
        cursor.execute("""
            INSERT INTO workflow_task_definitions
            (name, phase_code, description, color, order_index, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (task["name"], task["phase_code"], task["description"],
              task["color"], task["order_index"]))

        task_id = cursor.lastrowid
        print(f"Created task: {task['name']}")

        # Insert subtasks
        for subtask_index, subtask in enumerate(task["subtasks"]):
            cursor.execute("""
                INSERT INTO subtask_definitions
                (task_id, name, description, order_index, estimated_duration, is_required, is_active)
                VALUES (?, ?, ?, ?, ?, 1, 1)
            """, (task_id, subtask["name"], subtask["description"],
                  subtask_index, subtask["estimated_duration"]))

            subtask_id = cursor.lastrowid
            print(f"  - Subtask: {subtask['name']}")

            # Insert checklist items
            for item_index, (item_name, category) in enumerate(subtask["checklist"]):
                cursor.execute("""
                    INSERT INTO checklist_item_definitions
                    (subtask_id, name, activity_category, order_index, is_required, is_active)
                    VALUES (?, ?, ?, ?, 1, 1)
                """, (subtask_id, item_name, category, item_index))

            print(f"      + {len(subtask['checklist'])} checklist items")

    conn.commit()
    conn.close()
    print("\nWorkflow seeding completed successfully!")

    # Print summary
    print("\n" + "="*50)
    print("WORKFLOW SUMMARY")
    print("="*50)
    total_subtasks = sum(len(t["subtasks"]) for t in tasks)
    total_checklist = sum(sum(len(s["checklist"]) for s in t["subtasks"]) for t in tasks)
    print(f"Tasks: {len(tasks)}")
    print(f"Subtasks: {total_subtasks}")
    print(f"Checklist Items: {total_checklist}")


if __name__ == "__main__":
    clear_workflow_data()
    seed_complete_workflow()
