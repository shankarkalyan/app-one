"""Application Agent - Phase 2: Send app via DocuSign and track SLA."""
from typing import Dict, Any
from datetime import datetime, timedelta
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocuSignAPI


class ApplicationAgent(BaseAgent):
    """
    Phase 2: Application Agent

    Responsibilities:
    - Send application via DocuSign
    - Track SLA (25 days max)
    - Monitor application return
    - Check completeness
    """

    SLA_DAYS_MAX = 25

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "APPLICATION"
        self.docusign = MockDocuSignAPI(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute application process:
        1. Send application via DocuSign if not already sent
        2. Check envelope status
        3. Track SLA days
        4. Route based on completion/SLA
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        app_status = state.get("app_status", "pending")
        docusign_envelope_id = state.get("docusign_envelope_id")
        sla_days = state.get("sla_days", 0)

        updates = {
            "current_phase": "APPLICATION",
            "current_node": self.name,
        }

        # Step 1: Send application if not already sent
        if app_status == "pending" or not docusign_envelope_id:
            # Create and send DocuSign envelope
            envelope_result = self.docusign.create_envelope(
                application_id=application_id,
                recipient_email=customer_profile.get("email", ""),
                recipient_name=customer_profile.get("name", ""),
                documents=[
                    {"name": "Loan Assumption Application"},
                    {"name": "Authorization Form"},
                    {"name": "Disclosure Acknowledgment"},
                ],
            )

            if not envelope_result.get("success"):
                updates["last_error"] = envelope_result.get("error", "DocuSign error")

                msg_updates = self._add_message(
                    state,
                    f"Failed to send DocuSign envelope for application {application_id}",
                )
                updates.update(msg_updates)
                updates = self._update_timestamps(updates)

                # Retry by going back to supervisor
                return Command(
                    update=updates,
                    goto="supervisor_application",
                )

            updates["docusign_envelope_id"] = envelope_result.get("envelope_id")
            updates["app_status"] = "sent"
            updates["application_sent_at"] = datetime.utcnow().isoformat()
            updates["sla_deadline"] = (datetime.utcnow() + timedelta(days=self.SLA_DAYS_MAX)).isoformat()
            updates["sla_days"] = 0

            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Application Sent",
                description="Application sent via DocuSign",
                data=envelope_result,
                previous_value="pending",
                new_value="sent",
            )

            msg_updates = self._add_message(
                state,
                f"Application sent to {customer_profile.get('email')} via DocuSign. Envelope ID: {envelope_result.get('envelope_id')}",
            )
            updates.update(msg_updates)

            # Continue monitoring (will be called again by supervisor)
            updates = self._update_timestamps(updates)
            return Command(
                update=updates,
                goto="wait_for_application",  # Special waiting state
            )

        # Step 2: Check envelope status
        envelope_status = self.docusign.get_envelope_status(
            application_id=application_id,
            envelope_id=docusign_envelope_id,
        )

        if not envelope_status.get("success"):
            updates["last_error"] = "Failed to check envelope status"
            updates = self._update_timestamps(updates)
            return Command(
                update=updates,
                goto="wait_for_application",
            )

        status = envelope_status.get("status", "sent")

        # Calculate SLA days
        if state.get("application_sent_at"):
            sent_at = datetime.fromisoformat(state["application_sent_at"])
            sla_days = (datetime.utcnow() - sent_at).days
            updates["sla_days"] = sla_days

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Application Status Check",
            description=f"DocuSign status: {status}, SLA days: {sla_days}",
            data={"status": status, "sla_days": sla_days},
        )

        # Step 3: Check if completed
        if status == "completed":
            updates["app_status"] = "complete"
            updates["application_returned_at"] = datetime.utcnow().isoformat()

            self._log_transaction(
                application_id=application_id,
                event_type="DECISION",
                event_name="Application Complete",
                description="Application signed and returned",
                previous_value="sent",
                new_value="complete",
            )

            msg_updates = self._add_message(
                state,
                f"Application {application_id} completed. Proceeding to Disclosure phase.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_disclosure",
            )

        # Step 4: Check SLA
        if sla_days >= self.SLA_DAYS_MAX:
            updates["app_status"] = "incomplete"
            updates["end_state"] = "incomplete"
            updates["workflow_status"] = "completed"

            self._log_transaction(
                application_id=application_id,
                event_type="DECISION",
                event_name="SLA Exceeded",
                description=f"Application not complete within {self.SLA_DAYS_MAX} days",
                data={"sla_days": sla_days},
                previous_value="sent",
                new_value="incomplete",
            )

            msg_updates = self._add_message(
                state,
                f"Application {application_id} exceeded SLA of {self.SLA_DAYS_MAX} days. Sending incomplete closure letter.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="notify_incomplete",
            )

        # Still waiting - check if returned but incomplete
        if status in ["signed", "returned"]:
            updates["app_status"] = "returned"

            # For simulation, treat signed as complete
            updates["app_status"] = "complete"
            updates["application_returned_at"] = datetime.utcnow().isoformat()

            msg_updates = self._add_message(
                state,
                f"Application {application_id} returned. Proceeding to Disclosure phase.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_disclosure",
            )

        # Continue waiting
        updates["app_status"] = status
        msg_updates = self._add_message(
            state,
            f"Application {application_id} status: {status}. SLA day {sla_days} of {self.SLA_DAYS_MAX}.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="wait_for_application",
        )
