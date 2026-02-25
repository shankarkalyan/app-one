"""Review Agent - Phase 6b: Review With Agent."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent


class ReviewAgent(BaseAgent):
    """
    Phase 6b: Review Agent

    Responsibilities:
    - Review commitment terms with customer
    - Confirm customer understanding
    - Prepare for closing
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "COMMITMENT"

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute review with customer:
        1. Review commitment terms
        2. Confirm customer acceptance
        3. Route to Closing phase
        """
        application_id = state.get("application_id")
        commitment_letter = state.get("commitment_letter", {})
        call_agent = state.get("call_agent_assigned", "Unknown")

        updates = {
            "current_phase": "COMMITMENT",
            "current_node": self.name,
        }

        # Simulate review completion
        # In a real implementation, this might involve human interaction

        loan_terms = commitment_letter.get("terms", {})

        review_notes = [
            f"Interest rate confirmed: {loan_terms.get('interest_rate', 0)*100:.2f}%",
            f"Monthly payment reviewed: ${loan_terms.get('monthly_payment', 0):,.2f}",
            f"Loan term confirmed: {loan_terms.get('term_years', 30)} years",
            "Customer confirmed understanding of all terms",
            "Customer agreed to proceed with assumption",
        ]

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Customer Review Complete",
            description=f"Review completed by {call_agent}",
            data={"review_notes": review_notes, "call_agent": call_agent},
        )

        updates["review_completed"] = True

        msg_updates = self._add_message(
            state,
            f"Customer review completed for application {application_id}. Customer accepted terms. Proceeding to Closing phase.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="supervisor_closing",
        )
