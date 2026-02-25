"""Maintenance Agent - Phase 8: Complete System Maintenance MSP."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockMSPService


class MaintenanceAgent(BaseAgent):
    """
    Phase 8: Maintenance Agent

    Responsibilities:
    - Complete MSP system maintenance
    - Transfer loan to new borrower
    - Finalize all system updates
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "POST_CLOSING"
        self.msp_service = MockMSPService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute MSP maintenance:
        1. Start system maintenance
        2. Complete all maintenance tasks
        3. Route to SQ Review
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        loan_amount = state.get("loan_amount", 0)

        updates = {
            "current_phase": "POST_CLOSING",
            "current_node": self.name,
        }

        # Check if retrying after SQ failure
        sq_result = state.get("sq_review_result")
        if sq_result == "fail":
            updates["sq_review_result"] = None
            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Maintenance Retry",
                description="Retrying maintenance after SQ review failure",
            )

        # Check if maintenance already started
        msp_status = state.get("msp_status", "pending")

        if msp_status == "pending":
            # Start maintenance
            start_result = self.msp_service.start_maintenance(
                application_id=application_id,
                loan_number=f"LN-{application_id}",
                new_borrower_info=customer_profile,
            )

            if not start_result.get("success"):
                updates["last_error"] = "Maintenance start failed"

                msg_updates = self._add_message(
                    state,
                    f"Failed to start MSP maintenance for application {application_id}",
                )
                updates.update(msg_updates)
                updates = self._update_timestamps(updates)

                return Command(
                    update=updates,
                    goto="supervisor_post_closing",
                )

            updates["msp_status"] = "in_progress"

            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="MSP Maintenance Started",
                description=f"Started maintenance with {start_result.get('total_tasks', 0)} tasks",
                data=start_result,
                previous_value="pending",
                new_value="in_progress",
            )

        # Complete maintenance
        complete_result = self.msp_service.complete_maintenance(
            application_id=application_id,
            maintenance_id=f"MSP_{application_id}",
        )

        if not complete_result.get("success"):
            updates["last_error"] = "Maintenance completion failed"

            msg_updates = self._add_message(
                state,
                f"Failed to complete MSP maintenance for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_post_closing",
            )

        updates["msp_status"] = "complete"
        updates["msp_completed_at"] = datetime.utcnow().isoformat()

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="MSP Maintenance Complete",
            description=f"All {complete_result.get('total_tasks', 0)} maintenance tasks completed",
            data=complete_result,
            previous_value="in_progress",
            new_value="complete",
        )

        # Set up for SQ Review
        updates["sq_review_context"] = "maintenance"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        msg_updates = self._add_message(
            state,
            f"MSP maintenance completed for application {application_id}. Routing to final SQ Review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )
