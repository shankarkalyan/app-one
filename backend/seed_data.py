"""Seed the database with sample loan applications."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import init_db, SessionLocal
from backend.models.state import create_initial_state
from backend.workflow import create_loan_workflow

# Sample loan applications
SAMPLE_APPLICATIONS = [
    {
        "customer_name": "John Smith",
        "customer_email": "john.smith@example.com",
        "customer_phone": "555-123-4567",
        "ssn_last_four": "1234",
        "property_address": "123 Main Street, Austin, TX 78701",
        "loan_amount": 350000.00,
        "original_borrower": "Jane Doe",
    },
    {
        "customer_name": "Sarah Johnson",
        "customer_email": "sarah.j@example.com",
        "customer_phone": "555-234-5678",
        "ssn_last_four": "5678",
        "property_address": "456 Oak Avenue, Houston, TX 77001",
        "loan_amount": 425000.00,
        "original_borrower": "Michael Brown",
    },
    {
        "customer_name": "Robert Williams",
        "customer_email": "r.williams@example.com",
        "customer_phone": "555-345-6789",
        "ssn_last_four": "9012",
        "property_address": "789 Pine Road, Dallas, TX 75201",
        "loan_amount": 275000.00,
        "original_borrower": "Emily Davis",
    },
    {
        "customer_name": "Maria Garcia",
        "customer_email": "m.garcia@example.com",
        "customer_phone": "555-456-7890",
        "ssn_last_four": "3456",
        "property_address": "321 Cedar Lane, San Antonio, TX 78201",
        "loan_amount": 550000.00,
        "original_borrower": "James Wilson",
    },
    {
        "customer_name": "David Lee",
        "customer_email": "david.lee@example.com",
        "customer_phone": "555-567-8901",
        "ssn_last_four": "7890",
        "property_address": "654 Maple Drive, Fort Worth, TX 76101",
        "loan_amount": 380000.00,
        "original_borrower": "Lisa Anderson",
    },
]


def seed_database():
    """Seed the database with sample applications."""
    print("Initializing database...")
    init_db()

    db = SessionLocal()

    print(f"Creating {len(SAMPLE_APPLICATIONS)} sample applications...")

    for idx, app_data in enumerate(SAMPLE_APPLICATIONS, 1):
        print(f"\n--- Application {idx}/{len(SAMPLE_APPLICATIONS)} ---")
        print(f"Customer: {app_data['customer_name']}")
        print(f"Property: {app_data['property_address']}")
        print(f"Loan Amount: ${app_data['loan_amount']:,.2f}")

        try:
            # Generate application ID
            application_id = f"LA-SAMPLE{idx:03d}"

            # Create initial state
            initial_state = create_initial_state(
                application_id=application_id,
                **app_data,
            )

            # Create and run workflow
            workflow = create_loan_workflow(db=db)
            result = workflow.start(initial_state)

            print(f"Application ID: {application_id}")
            print(f"End State: {result.get('end_state', 'In Progress')}")
            print(f"Final Phase: {result.get('current_phase', 'Unknown')}")

        except Exception as e:
            print(f"Error creating application: {e}")
            continue

    db.close()
    print("\n\nDatabase seeding complete!")


if __name__ == "__main__":
    seed_database()
