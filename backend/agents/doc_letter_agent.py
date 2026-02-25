"""Doc Letter Agent - Phase 4: Create Missing Docs Letter."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocumentService


class DocLetterAgent(BaseAgent):
    """
    Phase 4: Doc Letter Agent

    Responsibilities:
    - Create letter for missing documents
    - Prepare letter for SQ review
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "LOAN_REVIEW"
        self.document_service = MockDocumentService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute doc letter creation:
        1. Get missing documents list
        2. Create missing docs letter
        3. Route to SQ Review
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        document_collection = state.get("document_collection", {})
        doc_request_count = state.get("doc_request_count", 0)

        updates = {
            "current_phase": "LOAN_REVIEW",
            "current_node": self.name,
        }

        # Check if retrying after SQ failure
        sq_result = state.get("sq_review_result")
        if sq_result == "fail":
            updates["sq_review_result"] = None
            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Doc Letter Retry",
                description="Retrying missing docs letter after SQ review failure",
            )

        # Get missing documents
        missing_docs = document_collection.get("missing_documents", [])

        if not missing_docs:
            # No missing docs - shouldn't be here, route to underwriting
            msg_updates = self._add_message(
                state,
                f"No missing documents for application {application_id}. Routing to Underwriting.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_underwriting",
            )

        # Create missing docs letter
        letter_result = self.document_service.create_missing_docs_letter(
            application_id=application_id,
            customer_name=customer_profile.get("name", ""),
            missing_documents=missing_docs,
        )

        if not letter_result.get("success"):
            updates["last_error"] = letter_result.get("error", "Letter creation failed")

            msg_updates = self._add_message(
                state,
                f"Failed to create missing docs letter for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="loan_review_agent",  # Retry from loan review
            )

        # Store letter details
        updates["missing_docs_letter"] = {
            "letter_id": letter_result.get("letter_id"),
            "type": letter_result.get("type"),
            "missing_documents": missing_docs,
            "deadline_days": letter_result.get("deadline_days", 15),
            "created_at": datetime.utcnow().isoformat(),
        }

        # Increment request count
        updates["doc_request_count"] = doc_request_count + 1
        updates["document_collection"] = {
            **document_collection,
            "request_count": doc_request_count + 1,
        }

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Missing Docs Letter Created",
            description=f"Created letter for {len(missing_docs)} missing documents (request #{doc_request_count + 1})",
            data=letter_result,
        )

        # Set up for SQ Review
        updates["sq_review_context"] = "missing_docs"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        msg_updates = self._add_message(
            state,
            f"Missing docs letter created for application {application_id}. Request #{doc_request_count + 1}. Routing to SQ Review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )
