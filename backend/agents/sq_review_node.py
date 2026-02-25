"""SQ Review Node - Reusable quality review checkpoint."""
from typing import Dict, Any
from datetime import datetime
import random
from langgraph.types import Command

from .base import BaseAgent


class SQReviewNode(BaseAgent):
    """
    Reusable SQ Review Node

    This is a single implementation invoked at 7 different checkpoints:
    1. Disclosure Package
    2. Missing Documents Letter
    3. Commitment Letter
    4. Denial Letter
    5. Closing Packet
    6. Review Closing Packet
    7. System Maintenance MSP

    Uses sq_review_context from state to determine what to review.
    Max 3 retries per checkpoint before human escalation.
    """

    MAX_RETRIES = 3

    # Review criteria for each context
    REVIEW_CRITERIA = {
        "disclosure": [
            "All required disclosures included",
            "Customer information accurate",
            "Loan terms correctly stated",
            "Regulatory compliance verified",
            "Signature fields properly placed",
        ],
        "missing_docs": [
            "All missing documents listed",
            "Deadline clearly stated",
            "Return instructions clear",
            "Customer name and address correct",
        ],
        "commitment": [
            "Interest rate accurate",
            "Monthly payment calculated correctly",
            "Conditions clearly stated",
            "Expiration date appropriate",
            "Terms match underwriting approval",
        ],
        "denial": [
            "Denial reasons properly documented",
            "Appeal information included",
            "Regulatory notices attached",
            "ECOA compliance verified",
            "FCRA compliance verified",
        ],
        "closing": [
            "All closing documents included",
            "Amounts match commitment letter",
            "Title information correct",
            "Escrow instructions complete",
            "Signing instructions clear",
        ],
        "review_closing": [
            "All signatures obtained",
            "Notarization complete",
            "Funds disbursed correctly",
            "Recording instructions ready",
            "No document errors",
        ],
        "maintenance": [
            "Borrower information updated",
            "Loan ownership transferred",
            "Payment schedule updated",
            "Insurance information current",
            "All systems synchronized",
        ],
    }

    # Routing for pass/fail outcomes
    ROUTING = {
        "disclosure": {
            "pass": "supervisor_loan_review",
            "fail": "disclosure_agent",
        },
        "missing_docs": {
            "pass": "notify_missing_docs",
            "fail": "doc_letter_agent",
        },
        "commitment": {
            "pass": "notify_commitment",
            "fail": "commitment_agent",
        },
        "denial": {
            "pass": "notify_denial",
            "fail": "denial_agent",
        },
        "closing": {
            "pass": "notify_closing",
            "fail": "closing_packet_agent",
        },
        "review_closing": {
            "pass": "maintenance_agent",
            "fail": "review_closing_agent",
        },
        "maintenance": {
            "pass": "end_loan_closed",
            "fail": "maintenance_agent",
        },
    }

    def __init__(self, db=None):
        super().__init__(db)
        self.agent_type = "SQ_REVIEW"
        self.phase = "SQ_REVIEW"

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute SQ review based on context:
        1. Determine review context
        2. Perform quality review
        3. Route based on pass/fail and retry count
        """
        application_id = state.get("application_id")
        context = state.get("sq_review_context", "unknown")
        retry_count = state.get("sq_retry_count", 0)

        updates = {
            "current_node": self.name,
        }

        # Validate context
        if context not in self.REVIEW_CRITERIA:
            updates["last_error"] = f"Unknown SQ review context: {context}"

            msg_updates = self._add_message(
                state,
                f"SQ Review error for application {application_id}: Unknown context '{context}'",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="error_handler",
            )

        # Get review criteria
        criteria = self.REVIEW_CRITERIA[context]

        # Simulate quality review
        # Pass rate increases slightly with each retry to prevent infinite loops
        base_pass_rate = 0.85
        adjusted_pass_rate = min(0.98, base_pass_rate + (retry_count * 0.05))

        passed = random.random() < adjusted_pass_rate

        # Generate review results
        review_results = []
        failed_criteria = []

        for criterion in criteria:
            criterion_passed = passed or random.random() > 0.3
            review_results.append({
                "criterion": criterion,
                "passed": criterion_passed,
                "reviewed_at": datetime.utcnow().isoformat(),
            })
            if not criterion_passed:
                failed_criteria.append(criterion)

        # If any criteria failed, mark overall as fail
        if failed_criteria:
            passed = False

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name=f"SQ Review - {context.title()}",
            description=f"Review {'PASSED' if passed else f'FAILED ({len(failed_criteria)} criteria)'} (attempt {retry_count + 1})",
            data={
                "context": context,
                "passed": passed,
                "retry_count": retry_count,
                "results": review_results,
                "failed_criteria": failed_criteria,
            },
        )

        if passed:
            # Reset retry count and mark pass
            updates["sq_review_result"] = "pass"
            updates["sq_retry_count"] = 0
            updates["sq_review_notes"] = state.get("sq_review_notes", []) + [
                f"{context.title()} review passed at {datetime.utcnow().isoformat()}"
            ]

            msg_updates = self._add_message(
                state,
                f"SQ Review PASSED for {context} in application {application_id}. Proceeding to next step.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            # Route to pass destination
            next_node = self.ROUTING[context]["pass"]

            # Special handling for final step
            if context == "maintenance":
                updates["end_state"] = "loan_closed"
                updates["workflow_status"] = "completed"
                updates["completed_at"] = datetime.utcnow().isoformat()

                self._log_transaction(
                    application_id=application_id,
                    event_type="DECISION",
                    event_name="Loan Closed",
                    description="All SQ reviews passed, loan assumption complete",
                )

            return Command(
                update=updates,
                goto=next_node,
            )
        else:
            # Increment retry count
            new_retry_count = retry_count + 1
            updates["sq_review_result"] = "fail"
            updates["sq_retry_count"] = new_retry_count
            updates["sq_review_notes"] = state.get("sq_review_notes", []) + [
                f"{context.title()} review failed (attempt {new_retry_count}): {', '.join(failed_criteria)}"
            ]

            # Check if max retries exceeded
            if new_retry_count >= self.MAX_RETRIES:
                # Escalate to human
                self._log_transaction(
                    application_id=application_id,
                    event_type="DECISION",
                    event_name="SQ Review Escalation",
                    description=f"Max retries ({self.MAX_RETRIES}) exceeded for {context} review, escalating to human",
                    data={"context": context, "retry_count": new_retry_count},
                )

                msg_updates = self._add_message(
                    state,
                    f"SQ Review for {context} exceeded max retries for application {application_id}. Escalating to human reviewer.",
                )
                updates.update(msg_updates)
                updates = self._update_timestamps(updates)

                return Command(
                    update=updates,
                    goto="human_sq_escalation",
                )

            msg_updates = self._add_message(
                state,
                f"SQ Review FAILED for {context} in application {application_id}. Failed criteria: {', '.join(failed_criteria)}. Attempt {new_retry_count}/{self.MAX_RETRIES}.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            # Route back to agent for correction
            next_node = self.ROUTING[context]["fail"]

            return Command(
                update=updates,
                goto=next_node,
            )
