"""Commitment Agent - Phase 6b: Make Commitment Letter."""
from typing import Dict, Any
from datetime import datetime
import random
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocumentService


class CommitmentAgent(BaseAgent):
    """
    Phase 6b: Commitment Agent

    Responsibilities:
    - Create commitment letter
    - Prepare for SQ review
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "COMMITMENT"
        self.document_service = MockDocumentService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute commitment letter creation:
        1. Create commitment letter with loan terms
        2. Route to SQ Review
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        loan_amount = state.get("loan_amount", 0)

        updates = {
            "current_phase": "COMMITMENT",
            "current_node": self.name,
        }

        # Check if retrying after SQ failure
        sq_result = state.get("sq_review_result")
        if sq_result == "fail":
            updates["sq_review_result"] = None
            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Commitment Letter Retry",
                description="Retrying commitment letter after SQ review failure",
            )

        # Generate loan terms
        interest_rate = round(random.uniform(0.045, 0.075), 4)  # 4.5% to 7.5%
        term_years = 30
        monthly_payment = self._calculate_monthly_payment(loan_amount, interest_rate, term_years)

        terms = {
            "interest_rate": interest_rate,
            "term_years": term_years,
            "monthly_payment": monthly_payment,
            "loan_type": "Fixed Rate",
            "assumption_fee": round(loan_amount * 0.01, 2),  # 1% assumption fee
        }

        # Create commitment letter
        letter_result = self.document_service.create_commitment_letter(
            application_id=application_id,
            customer_name=customer_profile.get("name", ""),
            loan_amount=loan_amount,
            interest_rate=interest_rate,
            terms=terms,
        )

        if not letter_result.get("success"):
            updates["last_error"] = letter_result.get("error", "Commitment letter creation failed")

            msg_updates = self._add_message(
                state,
                f"Failed to create commitment letter for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_commitment",
            )

        # Store commitment letter details
        updates["commitment_letter"] = {
            "document_id": letter_result.get("letter_id"),
            "terms": terms,
            "loan_details": letter_result.get("loan_details", {}),
            "conditions": letter_result.get("conditions", []),
            "expiration_days": letter_result.get("expiration_days", 30),
            "created_at": datetime.utcnow().isoformat(),
        }

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Commitment Letter Created",
            description=f"Created commitment letter: ${loan_amount:,.2f} at {interest_rate*100:.2f}%",
            data=letter_result,
        )

        # Set up for SQ Review
        updates["sq_review_context"] = "commitment"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        msg_updates = self._add_message(
            state,
            f"Commitment letter created for application {application_id}. Terms: ${loan_amount:,.2f} at {interest_rate*100:.2f}%. Routing to SQ Review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )

    def _calculate_monthly_payment(self, principal: float, annual_rate: float, years: int) -> float:
        """Calculate monthly mortgage payment."""
        monthly_rate = annual_rate / 12
        num_payments = years * 12

        if monthly_rate == 0:
            return principal / num_payments

        payment = principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / ((1 + monthly_rate) ** num_payments - 1)
        return round(payment, 2)
