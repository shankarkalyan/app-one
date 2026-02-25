"""Mock Case Optimizer API for Q&A verification."""
import random
from typing import Dict, Any, List
from .base import MockAPIBase


class MockCaseOptimizerAPI(MockAPIBase):
    """Mock Case Optimizer for caller verification and Q&A."""

    # Sample verification questions
    VERIFICATION_QUESTIONS = [
        "What is your date of birth?",
        "What is the last 4 digits of your SSN?",
        "What is your current mailing address?",
        "What is the property address for the assumption?",
        "Who is the original borrower on the loan?",
    ]

    def verify_caller(
        self,
        application_id: str,
        caller_name: str,
        ssn_last_four: str,
        property_address: str,
    ) -> Dict[str, Any]:
        """
        Verify the caller's identity through Q&A.

        Returns verification result with questions asked.
        """
        if self._should_fail():
            return {
                "success": False,
                "error": "Verification service unavailable",
            }

        # Simulate verification process
        questions_asked = random.sample(self.VERIFICATION_QUESTIONS, k=3)
        verification_passed = random.random() > 0.1  # 90% pass rate

        response = {
            "success": True,
            "verification_id": self._generate_id("VER_"),
            "caller_verified": verification_passed,
            "questions_asked": questions_asked,
            "questions_correct": len(questions_asked) if verification_passed else random.randint(0, 2),
            "verification_method": "Q&A",
            "verified_at": self._timestamp() if verification_passed else None,
            "risk_score": random.randint(10, 30) if verification_passed else random.randint(60, 90),
        }

        if not verification_passed:
            response["failure_reason"] = "Caller could not correctly answer verification questions"

        self._log_call(
            application_id=application_id,
            api_name="CaseOptimizer",
            endpoint="/verify-caller",
            method="POST",
            request_data={
                "caller_name": caller_name,
                "ssn_last_four": ssn_last_four[-4:] if len(ssn_last_four) >= 4 else "****",
                "property_address": property_address,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def run_optimization(
        self,
        application_id: str,
        loan_amount: float,
        property_address: str,
    ) -> Dict[str, Any]:
        """
        Run case optimization analysis.

        Returns optimization recommendations and scores.
        """
        if self._should_fail():
            return {
                "success": False,
                "error": "Optimization service error",
            }

        # Simulated optimization results
        response = {
            "success": True,
            "optimization_id": self._generate_id("OPT_"),
            "loan_details": {
                "amount": loan_amount,
                "property_address": property_address,
                "ltv_ratio": round(random.uniform(0.6, 0.95), 2),
            },
            "recommendation": random.choice(["proceed", "proceed_with_conditions", "review_required"]),
            "risk_factors": [
                {"factor": "Credit History", "score": random.randint(600, 850), "weight": 0.3},
                {"factor": "Debt to Income", "score": random.randint(20, 50), "weight": 0.25},
                {"factor": "Property Value", "score": random.randint(70, 100), "weight": 0.25},
                {"factor": "Employment Stability", "score": random.randint(60, 100), "weight": 0.2},
            ],
            "overall_score": random.randint(65, 95),
            "analyzed_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="CaseOptimizer",
            endpoint="/optimize",
            method="POST",
            request_data={
                "loan_amount": loan_amount,
                "property_address": property_address,
            },
            response_data=response,
            status_code=200,
        )

        return response
