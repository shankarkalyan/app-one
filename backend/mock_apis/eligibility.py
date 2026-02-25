"""Mock Eligibility Check API."""
import random
from typing import Dict, Any, List
from .base import MockAPIBase


class MockEligibilityAPI(MockAPIBase):
    """Mock API for checking loan assumption eligibility."""

    # Eligibility criteria
    ELIGIBILITY_CRITERIA = [
        "loan_type_assumable",
        "no_due_on_sale_clause",
        "property_in_eligible_state",
        "loan_current_on_payments",
        "no_pending_foreclosure",
        "buyer_creditworthy",
    ]

    INELIGIBILITY_REASONS = [
        "Loan type is not assumable",
        "Due-on-sale clause prevents assumption",
        "Property is in a non-eligible state",
        "Loan is delinquent",
        "Pending foreclosure on property",
        "Loan has been modified and is no longer assumable",
    ]

    def check_eligibility(
        self,
        application_id: str,
        loan_amount: float,
        property_address: str,
        original_borrower: str,
    ) -> Dict[str, Any]:
        """
        Check if the loan is eligible for assumption.

        Returns eligibility status with detailed criteria checks.
        """
        if self._should_fail():
            return {
                "success": False,
                "error": "Eligibility service unavailable",
            }

        # Simulate eligibility check (85% eligible rate)
        is_eligible = random.random() > 0.15

        # Check each criterion
        criteria_results = []
        for criterion in self.ELIGIBILITY_CRITERIA:
            passed = is_eligible or random.random() > 0.3
            criteria_results.append({
                "criterion": criterion,
                "passed": passed,
                "checked_at": self._timestamp(),
            })

        response = {
            "success": True,
            "eligibility_id": self._generate_id("ELIG_"),
            "is_eligible": is_eligible,
            "criteria_checked": criteria_results,
            "eligible_criteria_count": sum(1 for c in criteria_results if c["passed"]),
            "total_criteria": len(criteria_results),
        }

        if is_eligible:
            response["message"] = "Loan is eligible for assumption"
            response["next_steps"] = [
                "Send application to customer",
                "Collect required documentation",
                "Process through underwriting",
            ]
        else:
            # Pick random ineligibility reasons
            failed_criteria = [c for c in criteria_results if not c["passed"]]
            reasons = random.sample(
                self.INELIGIBILITY_REASONS,
                k=min(len(failed_criteria), 2)
            )
            response["ineligibility_reasons"] = reasons
            response["message"] = "Loan is not eligible for assumption"

        response["checked_at"] = self._timestamp()

        self._log_call(
            application_id=application_id,
            api_name="Eligibility",
            endpoint="/check",
            method="POST",
            request_data={
                "loan_amount": loan_amount,
                "property_address": property_address,
                "original_borrower": original_borrower,
            },
            response_data=response,
            status_code=200,
        )

        return response
