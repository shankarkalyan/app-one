"""Underwriter Review Agent - Phase 5: Review for Completeness."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockUnderwritingService


class UnderwriterReviewAgent(BaseAgent):
    """
    Phase 5: Underwriter Review Agent

    Responsibilities:
    - Review application for completeness
    - Determine if ready for decision
    - Loop if not ready (max 3 times)
    """

    MAX_REVIEW_CYCLES = 3

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "UNDERWRITING"
        self.underwriting_service = MockUnderwritingService(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute underwriter review:
        1. Review completeness
        2. If not ready, loop (up to max times)
        3. If ready, route to human decision
        """
        application_id = state.get("application_id")
        uw_review_count = state.get("uw_review_count", 0)

        updates = {
            "current_phase": "UNDERWRITING",
            "current_node": self.name,
        }

        # Increment review count
        uw_review_count += 1
        updates["uw_review_count"] = uw_review_count

        # Review completeness
        review_result = self.underwriting_service.review_completeness(
            application_id=application_id,
            checklist_id=f"CHKL_{application_id}",  # Mock checklist ID
        )

        if not review_result.get("success"):
            updates["last_error"] = "Review check failed"

            msg_updates = self._add_message(
                state,
                f"Failed to review completeness for application {application_id}",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="underwriting_agent",
            )

        is_ready = review_result.get("is_ready", False)
        issues = review_result.get("issues", [])

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Underwriting Review",
            description=f"Review #{uw_review_count}: {'Ready' if is_ready else f'Not ready - {len(issues)} issues'}",
            data=review_result,
        )

        if is_ready:
            updates["uw_readiness"] = "ready"

            self._log_transaction(
                application_id=application_id,
                event_type="DECISION",
                event_name="Ready for Decision",
                description="Application ready for underwriting decision",
                previous_value="not_ready",
                new_value="ready",
            )

            msg_updates = self._add_message(
                state,
                f"Application {application_id} is ready for underwriting decision. Routing to Human-in-the-Loop.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="human_decision",
            )
        else:
            updates["uw_readiness"] = "not_ready"

            if uw_review_count >= self.MAX_REVIEW_CYCLES:
                # Max reviews exceeded - escalate to senior underwriter
                self._log_transaction(
                    application_id=application_id,
                    event_type="DECISION",
                    event_name="Escalation Required",
                    description=f"Max review cycles ({self.MAX_REVIEW_CYCLES}) exceeded",
                    data={"issues": issues},
                )

                msg_updates = self._add_message(
                    state,
                    f"Application {application_id} escalated to senior underwriter after {uw_review_count} review cycles.",
                )
                updates.update(msg_updates)
                updates = self._update_timestamps(updates)

                # For simulation, proceed to human decision anyway
                return Command(
                    update=updates,
                    goto="human_decision",
                )

            # Loop back for another review
            msg_updates = self._add_message(
                state,
                f"Application {application_id} not ready. Review #{uw_review_count} issues: {', '.join(issues)}. Continuing review.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="underwriter_review_agent",  # Loop back
            )
