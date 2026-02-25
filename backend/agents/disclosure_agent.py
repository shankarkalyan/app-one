"""Disclosure Agent - Phase 3: Create and Send Disclosure Package."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocumentService, MockDocuSignAPI


class DisclosureAgent(BaseAgent):
    """
    Phase 3: Disclosure Agent

    Responsibilities:
    - Create disclosure package
    - Send disclosure package for signing
    - Track disclosure completion
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "DISCLOSURE"
        self.document_service = MockDocumentService(db)
        self.docusign = MockDocuSignAPI(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute disclosure process:
        1. Create disclosure package
        2. Send for signing
        3. Route to SQ Review
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        property_address = state.get("property_address", "")
        loan_amount = state.get("loan_amount", 0)
        disclosure_package = state.get("disclosure_package", {})

        updates = {
            "current_phase": "DISCLOSURE",
            "current_node": self.name,
        }

        # Check if we're retrying after SQ failure
        sq_result = state.get("sq_review_result")
        if sq_result == "fail":
            # Reset for retry
            updates["sq_review_result"] = None
            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Disclosure Retry",
                description="Retrying disclosure package after SQ review failure",
            )

        # Step 1: Create disclosure package
        package_result = self.document_service.create_disclosure_package(
            application_id=application_id,
            customer_name=customer_profile.get("name", ""),
            loan_amount=loan_amount,
            property_address=property_address,
        )

        if not package_result.get("success"):
            updates["last_error"] = package_result.get("error", "Document service error")

            msg_updates = self._add_message(
                state,
                f"Failed to create disclosure package for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_disclosure",  # Retry
            )

        # Update disclosure package in state
        updates["disclosure_package"] = {
            "document_ids": [doc["document_id"] for doc in package_result.get("documents", [])],
            "package_id": package_result.get("package_id"),
            "created_at": datetime.utcnow().isoformat(),
            "status": "created",
            "documents": package_result.get("documents", []),
        }

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Disclosure Package Created",
            description=f"Created disclosure package with {len(package_result.get('documents', []))} documents",
            data=package_result,
        )

        # Step 2: Send disclosure package via DocuSign
        envelope_result = self.docusign.create_envelope(
            application_id=application_id,
            recipient_email=customer_profile.get("email", ""),
            recipient_name=customer_profile.get("name", ""),
            documents=package_result.get("documents", []),
        )

        if not envelope_result.get("success"):
            updates["last_error"] = envelope_result.get("error", "DocuSign error")
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_disclosure",
            )

        # Update disclosure package with sent info
        updates["disclosure_package"]["sent_at"] = datetime.utcnow().isoformat()
        updates["disclosure_package"]["envelope_id"] = envelope_result.get("envelope_id")
        updates["disclosure_package"]["status"] = "sent"

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Disclosure Package Sent",
            description="Disclosure package sent for signing",
            data=envelope_result,
        )

        # Step 3: Set up for SQ Review
        updates["sq_review_context"] = "disclosure"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        msg_updates = self._add_message(
            state,
            f"Disclosure package created and sent for application {application_id}. Routing to SQ Review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )
