"""Intake Agent - Phase 1: Verify caller and run Case Optimizer."""
from typing import Dict, Any
from datetime import datetime
from langgraph.types import Command

from .base import BaseAgent
from mock_apis import MockCaseOptimizerAPI, MockEligibilityAPI


class IntakeAgent(BaseAgent):
    """
    Phase 1: Intake Agent

    Responsibilities:
    - Verify caller identity through Q&A
    - Run Case Optimizer analysis
    - Determine loan eligibility for assumption
    """

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "INTAKE"
        self.case_optimizer = MockCaseOptimizerAPI(db)
        self.eligibility_api = MockEligibilityAPI(db)

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute intake process:
        1. Verify caller identity
        2. Run case optimization
        3. Check eligibility
        4. Route based on eligibility
        """
        application_id = state.get("application_id")
        customer_profile = state.get("customer_profile", {})
        property_address = state.get("property_address", "")
        loan_amount = state.get("loan_amount", 0)
        original_borrower = state.get("original_borrower", "")

        # Initialize state updates
        updates = {
            "current_phase": "INTAKE",
            "current_node": self.name,
        }

        # Step 1: Verify caller
        verification_result = self.case_optimizer.verify_caller(
            application_id=application_id,
            caller_name=customer_profile.get("name", ""),
            ssn_last_four=customer_profile.get("ssn_last_four", ""),
            property_address=property_address,
        )

        if not verification_result.get("success") or not verification_result.get("caller_verified"):
            # Verification failed
            updates["eligibility_status"] = "ineligible"
            updates["eligibility_reasons"] = ["Caller verification failed"]
            updates["customer_profile"] = {
                **customer_profile,
                "is_authorized": False,
            }

            self._log_transaction(
                application_id=application_id,
                event_type="DECISION",
                event_name="Caller Verification Failed",
                description="Caller could not be verified",
                data=verification_result,
                previous_value="pending",
                new_value="ineligible",
            )

            # Add message about the result
            msg_updates = self._add_message(
                state,
                f"Caller verification failed for application {application_id}. Routing to ineligible path.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="notify_ineligible",
            )

        # Update customer profile with verification
        updates["customer_profile"] = {
            **customer_profile,
            "is_authorized": True,
            "authorization_method": "Q&A Verification",
        }

        # Step 2: Run Case Optimizer
        optimization_result = self.case_optimizer.run_optimization(
            application_id=application_id,
            loan_amount=loan_amount,
            property_address=property_address,
        )

        updates["case_optimizer_result"] = optimization_result

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Case Optimization Complete",
            description=f"Case optimizer score: {optimization_result.get('overall_score', 'N/A')}",
            data=optimization_result,
        )

        # Step 3: Check Eligibility
        eligibility_result = self.eligibility_api.check_eligibility(
            application_id=application_id,
            loan_amount=loan_amount,
            property_address=property_address,
            original_borrower=original_borrower,
        )

        if not eligibility_result.get("success"):
            updates["eligibility_status"] = "ineligible"
            updates["eligibility_reasons"] = ["Eligibility check service error"]

            msg_updates = self._add_message(
                state,
                f"Eligibility check failed for application {application_id}. Service error.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="notify_ineligible",
            )

        is_eligible = eligibility_result.get("is_eligible", False)

        if is_eligible:
            updates["eligibility_status"] = "eligible"
            updates["eligibility_reasons"] = eligibility_result.get("next_steps", [])

            self._log_transaction(
                application_id=application_id,
                event_type="DECISION",
                event_name="Eligibility Determined",
                description="Loan is eligible for assumption",
                data=eligibility_result,
                previous_value="pending",
                new_value="eligible",
            )

            msg_updates = self._add_message(
                state,
                f"Application {application_id} is eligible for assumption. Proceeding to Application phase.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="supervisor_application",
            )
        else:
            updates["eligibility_status"] = "ineligible"
            updates["eligibility_reasons"] = eligibility_result.get("ineligibility_reasons", ["Unknown reason"])

            self._log_transaction(
                application_id=application_id,
                event_type="DECISION",
                event_name="Eligibility Determined",
                description="Loan is not eligible for assumption",
                data=eligibility_result,
                previous_value="pending",
                new_value="ineligible",
            )

            msg_updates = self._add_message(
                state,
                f"Application {application_id} is ineligible for assumption. Sending ineligible letter.",
            )
            updates.update(msg_updates)
            updates = self._update_timestamps(updates)

            return Command(
                update=updates,
                goto="notify_ineligible",
            )
