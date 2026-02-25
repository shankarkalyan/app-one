"""Notify Agent - Centralized notification handler."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockNotificationService, MockTitleAgencyAPI


class NotifyAgent(BaseAgent):
    """
    Utility Node: Notify Agent

    Responsibilities:
    - Send all types of notifications
    - Handle ineligible, incomplete, missing docs, commitment, denial, closure letters
    - Route based on notification type
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.agent_type = "NOTIFY"
        self.phase = "NOTIFICATION"
        self.notification_service = MockNotificationService(db)
        self.title_agency = MockTitleAgencyAPI(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute notification based on notification_type in state.
        """
        application_id = state.get("application_id")
        notification_type = state.get("notification_type", "")
        customer_profile = state.get("customer_profile", {})

        updates = {
            "current_node": self.name,
        }

        customer_name = customer_profile.get("name", "")
        customer_email = customer_profile.get("email", "")

        # Determine which notification to send based on the goto node name
        # The supervisor/workflow sets notification_type before routing here

        # Route based on current context
        current_node = state.get("previous_node", "")

        if "ineligible" in current_node.lower() or notification_type == "ineligible":
            return self._send_ineligible(state, application_id, customer_name, customer_email, updates)

        elif "incomplete" in current_node.lower() or notification_type == "incomplete":
            return self._send_incomplete(state, application_id, customer_name, customer_email, updates)

        elif "withdrawn" in current_node.lower() or notification_type == "withdrawn":
            return self._send_withdrawn(state, application_id, customer_name, customer_email, updates)

        elif "missing_docs" in notification_type or state.get("sq_review_context") == "missing_docs":
            return self._send_missing_docs(state, application_id, customer_name, customer_email, updates)

        elif "commitment" in notification_type or state.get("sq_review_context") == "commitment":
            return self._send_commitment(state, application_id, customer_name, customer_email, updates)

        elif "denial" in notification_type or state.get("sq_review_context") == "denial":
            return self._send_denial(state, application_id, customer_name, customer_email, updates)

        elif "closing" in notification_type or state.get("sq_review_context") == "closing":
            return self._send_closing_packet(state, application_id, updates)

        else:
            # Generic status update
            msg_updates = self._add_message(
                state,
                f"Notification sent for application {application_id}: {notification_type}",
            )
            updates.update(msg_updates)
            updates["notification_sent"] = True
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_router",
            )

    def _send_ineligible(self, state, application_id, customer_name, customer_email, updates):
        """Send ineligibility letter and end workflow."""
        reasons = state.get("eligibility_reasons", ["Loan is not eligible for assumption"])

        result = self.notification_service.send_ineligible_letter(
            application_id=application_id,
            customer_name=customer_name,
            customer_email=customer_email,
            reasons=reasons,
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Ineligible Letter Sent",
            description=f"Sent ineligible letter to {customer_email}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["notification_type"] = "ineligible"
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "ineligible",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]
        updates["end_state"] = "ineligible"
        updates["workflow_status"] = "completed"
        updates["completed_at"] = datetime.utcnow().isoformat()

        msg_updates = self._add_message(
            state,
            f"Ineligible letter sent for application {application_id}. Workflow ended.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="end_ineligible",
        )

    def _send_incomplete(self, state, application_id, customer_name, customer_email, updates):
        """Send incomplete closure letter and end workflow."""
        sla_days = state.get("sla_days", 0)

        result = self.notification_service.send_incomplete_closure(
            application_id=application_id,
            customer_name=customer_name,
            customer_email=customer_email,
            days_elapsed=sla_days,
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Incomplete Closure Letter Sent",
            description=f"Sent incomplete closure letter to {customer_email}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["notification_type"] = "incomplete"
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "incomplete",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]
        updates["end_state"] = "incomplete"
        updates["workflow_status"] = "completed"
        updates["completed_at"] = datetime.utcnow().isoformat()

        msg_updates = self._add_message(
            state,
            f"Incomplete closure letter sent for application {application_id}. Workflow ended.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="end_incomplete",
        )

    def _send_withdrawn(self, state, application_id, customer_name, customer_email, updates):
        """Send customer withdrawn notification and end workflow."""
        result = self.notification_service.send_customer_withdrawn(
            application_id=application_id,
            customer_name=customer_name,
            customer_email=customer_email,
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Withdrawal Notice Sent",
            description=f"Sent withdrawal notice to {customer_email}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["notification_type"] = "withdrawn"
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "withdrawn",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]
        updates["end_state"] = "withdrawn"
        updates["workflow_status"] = "completed"
        updates["completed_at"] = datetime.utcnow().isoformat()

        msg_updates = self._add_message(
            state,
            f"Withdrawal notice sent for application {application_id}. Workflow ended.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="end_withdrawn",
        )

    def _send_missing_docs(self, state, application_id, customer_name, customer_email, updates):
        """Send missing documents letter to customer."""
        missing_docs_letter = state.get("missing_docs_letter", {})

        result = self.notification_service.send_document_to_customer(
            application_id=application_id,
            customer_name=customer_name,
            customer_email=customer_email,
            document_type="missing_documents",
            document_id=missing_docs_letter.get("letter_id", ""),
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Missing Docs Letter Sent",
            description=f"Sent missing docs letter to {customer_email}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["doc_status"] = "requested"
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "missing_documents",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]

        msg_updates = self._add_message(
            state,
            f"Missing documents letter sent for application {application_id}. Waiting for customer response.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="wait_for_documents",
        )

    def _send_commitment(self, state, application_id, customer_name, customer_email, updates):
        """Send commitment letter to customer."""
        commitment_letter = state.get("commitment_letter", {})

        result = self.notification_service.send_document_to_customer(
            application_id=application_id,
            customer_name=customer_name,
            customer_email=customer_email,
            document_type="commitment_letter",
            document_id=commitment_letter.get("document_id", ""),
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Commitment Letter Sent",
            description=f"Sent commitment letter to {customer_email}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "commitment_letter",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]

        msg_updates = self._add_message(
            state,
            f"Commitment letter sent for application {application_id}. Routing to Call Agent.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="call_agent",
        )

    def _send_denial(self, state, application_id, customer_name, customer_email, updates):
        """Send denial letter to customer and end workflow."""
        denial_letter = state.get("denial_letter", {})

        result = self.notification_service.send_document_to_customer(
            application_id=application_id,
            customer_name=customer_name,
            customer_email=customer_email,
            document_type="denial_letter",
            document_id=denial_letter.get("document_id", ""),
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Denial Letter Sent",
            description=f"Sent denial letter to {customer_email}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "denial_letter",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]
        updates["end_state"] = "denied"
        updates["workflow_status"] = "completed"
        updates["completed_at"] = datetime.utcnow().isoformat()

        msg_updates = self._add_message(
            state,
            f"Denial letter sent for application {application_id}. Workflow ended.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="end_denied",
        )

    def _send_closing_packet(self, state, application_id, updates):
        """Send closing packet to title agency."""
        closing_packet = state.get("closing_packet", {})
        title_agency_info = closing_packet.get("title_agency", {})

        result = self.title_agency.send_closing_packet(
            application_id=application_id,
            title_agency_id=title_agency_info.get("id", ""),
            closing_packet_id=closing_packet.get("packet_id", ""),
            closing_date=closing_packet.get("closing_date", ""),
        )

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Closing Packet Sent to Title Agency",
            description=f"Sent closing packet to {title_agency_info.get('name')}",
            data=result,
        )

        updates["notification_sent"] = True
        updates["title_agency_notified"] = True
        updates["notifications_history"] = state.get("notifications_history", []) + [{
            "type": "closing_packet",
            "sent_at": datetime.utcnow().isoformat(),
            "result": result,
        }]

        msg_updates = self._add_message(
            state,
            f"Closing packet sent to title agency for application {application_id}. Routing to post-closing review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="review_closing_agent",
        )
