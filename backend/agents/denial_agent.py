"""Denial Agent - Phase 6a: Make Denial Letter."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockDocumentService, MockUnderwritingService


class DenialAgent(BaseAgent):
    """
    Phase 6a: Denial Agent

    Responsibilities:
    - Get denial reasons
    - Create denial letter
    - Prepare for SQ review
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "DENIAL"
        self.document_service = MockDocumentService(db)
        self.underwriting_service = MockUnderwritingService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute denial letter creation:
        1. Get denial reasons from underwriting
        2. Create denial letter
        3. Route to SQ Review
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})

        updates = {
            "current_phase": "DENIAL",
            "current_node": self.name,
        }

        # Check if retrying after SQ failure
        sq_result = state.get("sq_review_result")
        if sq_result == "fail":
            updates["sq_review_result"] = None
            self._log_transaction(
                application_id=application_id,
                event_type="STATE_CHANGE",
                event_name="Denial Letter Retry",
                description="Retrying denial letter after SQ review failure",
            )

        # Get denial reasons
        reasons_result = self.underwriting_service.get_denial_reasons(
            application_id=application_id,
        )

        denial_reasons = reasons_result.get("reasons", ["Application did not meet lending criteria"])

        # Create denial letter
        letter_result = self.document_service.create_denial_letter(
            application_id=application_id,
            customer_name=customer_profile.get("name", ""),
            denial_reasons=denial_reasons,
        )

        if not letter_result.get("success"):
            updates["last_error"] = letter_result.get("error", "Denial letter creation failed")

            msg_updates = self._add_message(
                state,
                f"Failed to create denial letter for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_denial",
            )

        # Store denial letter details
        updates["denial_letter"] = {
            "document_id": letter_result.get("letter_id"),
            "reasons": denial_reasons,
            "appeal_info": letter_result.get("appeal_info", {}),
            "regulatory_notices": letter_result.get("regulatory_notices", []),
            "created_at": datetime.utcnow().isoformat(),
        }

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Denial Letter Created",
            description=f"Created denial letter with {len(denial_reasons)} reason(s)",
            data=letter_result,
        )

        # Set up for SQ Review
        updates["sq_review_context"] = "denial"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        msg_updates = self._add_message(
            state,
            f"Denial letter created for application {application_id}. Routing to SQ Review.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )
