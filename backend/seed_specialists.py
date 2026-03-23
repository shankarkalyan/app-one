"""Seed script to create initial specialist users."""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal, init_db
from database.models import Specialist, SPECIALTY_TYPES
from services.auth import hash_password


def seed_specialists():
    """Create initial specialist users for testing."""
    init_db()
    db = SessionLocal()

    # Check if specialists already exist
    existing = db.query(Specialist).count()
    if existing > 0:
        print(f"Found {existing} existing specialists. Skipping seed.")
        db.close()
        return

    # Create one specialist per specialty type
    specialists = [
        {
            "username": "intake_specialist",
            "password": "password123",
            "full_name": "Alice Johnson",
            "email": "alice.johnson@example.com",
            "specialty_type": "INTAKE",
            "role": "specialist",
        },
        {
            "username": "app_specialist",
            "password": "password123",
            "full_name": "Bob Smith",
            "email": "bob.smith@example.com",
            "specialty_type": "APPLICATION",
            "role": "specialist",
        },
        {
            "username": "disclosure_specialist",
            "password": "password123",
            "full_name": "Carol Davis",
            "email": "carol.davis@example.com",
            "specialty_type": "DISCLOSURE",
            "role": "specialist",
        },
        {
            "username": "loan_review_specialist",
            "password": "password123",
            "full_name": "David Wilson",
            "email": "david.wilson@example.com",
            "specialty_type": "LOAN_REVIEW",
            "role": "specialist",
        },
        {
            "username": "underwriter",
            "password": "password123",
            "full_name": "Eva Martinez",
            "email": "eva.martinez@example.com",
            "specialty_type": "UNDERWRITING",
            "role": "specialist",
        },
        {
            "username": "commitment_specialist",
            "password": "password123",
            "full_name": "Frank Brown",
            "email": "frank.brown@example.com",
            "specialty_type": "COMMITMENT",
            "role": "specialist",
        },
        {
            "username": "closing_specialist",
            "password": "password123",
            "full_name": "Grace Lee",
            "email": "grace.lee@example.com",
            "specialty_type": "CLOSING",
            "role": "specialist",
        },
        {
            "username": "post_closing_specialist",
            "password": "password123",
            "full_name": "Henry Taylor",
            "email": "henry.taylor@example.com",
            "specialty_type": "POST_CLOSING",
            "role": "specialist",
        },
        # Admin user
        {
            "username": "admin",
            "password": "admin123",
            "full_name": "System Admin",
            "email": "admin@example.com",
            "specialty_type": "INTAKE",  # Required but not used for admin
            "role": "admin",
        },
    ]

    for spec_data in specialists:
        specialist = Specialist(
            username=spec_data["username"],
            password_hash=hash_password(spec_data["password"]),
            full_name=spec_data["full_name"],
            email=spec_data["email"],
            specialty_type=spec_data["specialty_type"],
            role=spec_data["role"],
        )
        db.add(specialist)
        print(f"Created specialist: {spec_data['username']} ({spec_data['specialty_type']})")

    db.commit()
    db.close()

    print(f"\nCreated {len(specialists)} specialists successfully!")
    print("\nDefault credentials:")
    print("  - Specialists: password123")
    print("  - Admin: admin123")


if __name__ == "__main__":
    seed_specialists()
