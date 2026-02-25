"""Closing Packet Agent - Phase 7: Create and Complete Closing Packet."""
from typing import Dict, Any
from datetime import datetime, timedelta
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocumentService, MockTitleAgencyAPI


class ClosingPacketAgent(BaseAgent):
    """
    Phase 7: Closing Packet Agent

    Responsibilities:
    - Create closing packet
    - Assign title agency
    - Prepare for SQ review
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "CLOSING"
        self.document_service = MockDocumentService(db)
        self.title_agency = MockTitleAgencyAPI(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute closing packet creation:
        1. Create closing packet
        2. Assign title agency
        3. Route to SQ Review
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        property_address = state.get("property_address", "")
        loan_amount = state.get("loan_amount", 0)

        updates = {
            "current_phase": "CLOSING",
            "current_node": self.name,
        }

        # Check if retrying after SQ failure
        sq_result = state.get("sq_review_result")
        if sq_result == "fail":
            updates["sq_review_result"] = None
            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Closing Packet Retry",
                description="Retrying closing packet after SQ review failure",
            )

        # Step 1: Create closing packet
        packet_result = self.document_service.create_closing_packet(
            application_id=application_id,
            customer_name=customer_profile.get("name", ""),
            loan_amount=loan_amount,
            property_address=property_address,
        )

        if not packet_result.get("success"):
            updates["last_error"] = packet_result.get("error", "Closing packet creation failed")

            msg_updates = self._add_message(
                state,
                f"Failed to create closing packet for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_closing",
            )

        # Step 2: Assign title agency
        agency_result = self.title_agency.assign_title_agency(
            application_id=application_id,
            property_address=property_address,
        )

        if not agency_result.get("success"):
            updates["last_error"] = agency_result.get("error", "Title agency assignment failed")

            msg_updates = self._add_message(
                state,
                f"Failed to assign title agency for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_closing",
            )

        title_agency_info = agency_result.get("title_agency", {})

        # Store closing packet details
        updates["closing_packet"] = {
            "packet_id": packet_result.get("packet_id"),
            "document_ids": [doc["document_id"] for doc in packet_result.get("documents", [])],
            "documents": packet_result.get("documents", []),
            "total_pages": packet_result.get("total_pages", 0),
            "title_agency": title_agency_info,
            "closing_date": agency_result.get("scheduled_closing_date"),
            "closing_time": agency_result.get("closing_time"),
            "created_at": datetime.utcnow().isoformat(),
        }

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Closing Packet Created",
            description=f"Created closing packet with {len(packet_result.get('documents', []))} documents, assigned to {title_agency_info.get('name')}",
            data={**packet_result, "title_agency": title_agency_info},
        )

        # Set up for SQ Review
        updates["sq_review_context"] = "closing"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        msg_updates = self._add_message(
            state,
            f"Closing packet created for application {application_id}. Closing scheduled for {agency_result.get('scheduled_closing_date')} at {title_agency_info.get('name')}. Routing to SQ Review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )
