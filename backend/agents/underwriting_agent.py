"""Underwriting Agent - Phase 5: Checklist and Assign."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockUnderwritingService


class UnderwritingAgent(BaseAgent):
    """
    Phase 5: Underwriting Agent

    Responsibilities:
    - Run underwriting checklist
    - Assign underwriter
    - Prepare for review
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "UNDERWRITING"
        self.underwriting_service = MockUnderwritingService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute underwriting setup:
        1. Run underwriting checklist
        2. Assign underwriter
        3. Route to Underwriter Review Agent
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        loan_amount = state.get("loan_amount", 0)

        updates = {
            "current_phase": "UNDERWRITING",
            "current_node": self.name,
        }

        # Step 1: Run underwriting checklist
        checklist_result = self.underwriting_service.run_checklist(
            application_id=application_id,
            loan_amount=loan_amount,
            customer_name=customer_profile.get("name", ""),
        )

        if not checklist_result.get("success"):
            updates["last_error"] = "Checklist failed"

            msg_updates = self._add_message(
                state,
                f"Failed to run underwriting checklist for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_underwriting",
            )

        updates["uw_checklist_complete"] = checklist_result.get("all_passed", False)

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Underwriting Checklist Complete",
            description=f"Checklist: {checklist_result.get('items_passed')}/{checklist_result.get('total_items')} items passed",
            data=checklist_result,
        )

        # Step 2: Assign underwriter
        priority = "high" if loan_amount > 500000 else "normal"

        assignment_result = self.underwriting_service.assign_underwriter(
            application_id=application_id,
            loan_amount=loan_amount,
            priority=priority,
        )

        if not assignment_result.get("success"):
            updates["last_error"] = "Underwriter assignment failed"

            msg_updates = self._add_message(
                state,
                f"Failed to assign underwriter for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_underwriting",
            )

        underwriter = assignment_result.get("underwriter", {})
        updates["uw_assigned_to"] = underwriter.get("name", "Unknown")

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Underwriter Assigned",
            description=f"Assigned to {underwriter.get('name')} ({underwriter.get('level')})",
            data=assignment_result,
        )

        # Initialize review tracking
        updates["uw_readiness"] = "pending"
        updates["uw_review_count"] = 0

        msg_updates = self._add_message(
            state,
            f"Underwriting setup complete for application {application_id}. Assigned to {underwriter.get('name')}. Routing to review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="underwriter_review_agent",
        )
