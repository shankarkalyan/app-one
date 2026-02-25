"""Review Closing Agent - Phase 8: Review Closing Packet."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockMSPService


class ReviewClosingAgent(BaseAgent):
    """
    Phase 8: Review Closing Agent

    Responsibilities:
    - Review completed closing packet
    - Verify all documents are properly executed
    - Prepare for SQ review
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "POST_CLOSING"
        self.msp_service = MockMSPService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute closing packet review:
        1. Review closing packet for completeness
        2. Route to SQ Review
        """
        application_id = state.get("application_id")
        closing_packet = state.get("closing_packet", {})

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
                event_name="Closing Review Retry",
                description="Retrying closing review after SQ review failure",
            )

        # Review closing packet
        review_result = self.msp_service.review_closing_packet(
            application_id=application_id,
            closing_packet_id=closing_packet.get("packet_id", ""),
        )

        if not review_result.get("success"):
            updates["last_error"] = "Closing review failed"

            msg_updates = self._add_message(
                state,
                f"Failed to review closing packet for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_post_closing",
            )

        review_passed = review_result.get("review_passed", False)
        issues = review_result.get("issues", [])

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Closing Packet Reviewed",
            description=f"Review {'passed' if review_passed else f'failed with {len(issues)} issues'}",
            data=review_result,
        )

        if not review_passed:
            # If review didn't pass in the API check, still proceed but flag it
            updates["closing_reviewed"] = False

            msg_updates = self._add_message(
                state,
                f"Closing packet review found issues for application {application_id}: {', '.join(issues)}. Proceeding to SQ Review.",
            )
            updates.update(msg_updates)
        else:
            updates["closing_reviewed"] = True

            msg_updates = self._add_message(
                state,
                f"Closing packet reviewed successfully for application {application_id}. Routing to SQ Review.",
            )
            updates.update(msg_updates)

        # Set up for SQ Review
        updates["sq_review_context"] = "review_closing"
        updates["sq_retry_count"] = state.get("sq_retry_count", 0)

        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="sq_review",
        )
