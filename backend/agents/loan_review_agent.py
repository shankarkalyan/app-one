"""Loan Review Agent - Phase 4: Check if documents needed."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocumentService


class LoanReviewAgent(BaseAgent):
    """
    Phase 4: Loan Review Agent

    Responsibilities:
    - Evaluate if additional documents are needed
    - Manage document collection loop
    - Track document status
    """

    MAX_DOC_REQUESTS = 2

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "LOAN_REVIEW"
        self.document_service = MockDocumentService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute loan review process:
        1. Check for required documents
        2. Determine if documents are missing
        3. Route based on document status
        """
        application_id = state.get("application_id")
        doc_status = state.get("doc_status", "pending")
        document_collection = state.get("document_collection", {})
        doc_request_count = state.get("doc_request_count", 0)

        updates = {
            "current_phase": "LOAN_REVIEW",
            "current_node": self.name,
        }

        # Check if returning from document request
        if doc_status == "returned":
            # Documents have been received - verify completeness
            received_docs = document_collection.get("received_documents", [])

            check_result = self.document_service.check_required_documents(
                application_id=application_id,
                received_documents=received_docs,
            )

            if check_result.get("all_documents_received", False):
                # All documents received - proceed to underwriting
                updates["docs_needed"] = False
                updates["doc_status"] = "complete"
                updates["document_collection"] = {
                    **document_collection,
                    "missing_documents": [],
                    "completion_percentage": 100,
                }

                self._log_transaction(
                    application_id=application_id,
                    event_type="DECISION",
                    event_name="Documents Complete",
                    description="All required documents received",
                    previous_value="returned",
                    new_value="complete",
                )

                msg_updates = self._add_message(
                    state,
                    f"All documents received for application {application_id}. Proceeding to Underwriting.",
                )
                updates.update(msg_updates)
                updates = self._update_timestamps(updates)

                return Command(
                    update=updates,
                    goto="supervisor_underwriting",
                )
            else:
                # Still missing documents - need another request if within limit
                missing = check_result.get("missing_documents", [])
                updates["document_collection"] = {
                    **document_collection,
                    "missing_documents": missing,
                    "received_documents": check_result.get("received_documents", []),
                    "completion_percentage": check_result.get("completion_percentage", 0),
                }
                updates["docs_needed"] = True

                # Fall through to document request logic below

        # Initial document check
        received_docs = document_collection.get("received_documents", [])

        check_result = self.document_service.check_required_documents(
            application_id=application_id,
            received_documents=received_docs,
        )

        if not check_result.get("success"):
            updates["last_error"] = "Document check failed"
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_loan_review",
            )

        missing_docs = check_result.get("missing_documents", [])
        all_received = check_result.get("all_documents_received", False)

        # Update document collection state
        updates["document_collection"] = {
            "required_documents": check_result.get("required_documents", []),
            "received_documents": check_result.get("received_documents", []),
            "missing_documents": missing_docs,
            "request_count": doc_request_count,
            "completion_percentage": check_result.get("completion_percentage", 0),
        }

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Document Check Complete",
            description=f"Missing {len(missing_docs)} documents, {check_result.get('completion_percentage', 0)}% complete",
            data=check_result,
        )

        if all_received:
            # No documents needed - proceed to underwriting
            updates["docs_needed"] = False
            updates["doc_status"] = "complete"

            msg_updates = self._add_message(
                state,
                f"All documents received for application {application_id}. Proceeding to Underwriting.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_underwriting",
            )
        else:
            # Documents needed
            updates["docs_needed"] = True

            if doc_request_count >= self.MAX_DOC_REQUESTS:
                # Max requests exceeded - customer withdrawn
                updates["doc_status"] = "withdrawn"
                updates["end_state"] = "withdrawn"
                updates["workflow_status"] = "completed"

                self._log_transaction(
                    application_id=application_id,
                    event_type="DECISION",
                    event_name="Customer Withdrawn",
                    description=f"Documents not received after {doc_request_count} requests",
                    previous_value="requested",
                    new_value="withdrawn",
                )

                msg_updates = self._add_message(
                    state,
                    f"Customer withdrawn for application {application_id} - documents not received after {doc_request_count} requests.",
                )
                updates.update(msg_updates)
                updates = self._update_timestamps(updates)

                return Command(
                    update=updates,
                    goto="notify_withdrawn",
                )

            # Route to DocLetterAgent to create missing docs letter
            updates["doc_status"] = "pending"

            msg_updates = self._add_message(
                state,
                f"Missing {len(missing_docs)} documents for application {application_id}. Creating missing documents letter.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="doc_letter_agent",
            )
