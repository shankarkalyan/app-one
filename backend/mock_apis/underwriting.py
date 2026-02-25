"""Mock Underwriting Service API."""
import random
from typing import Dict, Any, List
from .base import MockAPIBase


class MockUnderwritingService(MockAPIBase):
    """Mock API for underwriting operations."""

    UNDERWRITERS = [
        {"id": "UW001", "name": "John Smith", "level": "Senior"},
        {"id": "UW002", "name": "Sarah Johnson", "level": "Senior"},
        {"id": "UW003", "name": "Mike Williams", "level": "Junior"},
        {"id": "UW004", "name": "Emily Davis", "level": "Junior"},
        {"id": "UW005", "name": "Robert Brown", "level": "Lead"},
    ]

    CHECKLIST_ITEMS = [
        {"item": "Identity Verification", "category": "Customer"},
        {"item": "Income Verification", "category": "Financial"},
        {"item": "Employment Verification", "category": "Financial"},
        {"item": "Credit Report Review", "category": "Financial"},
        {"item": "Debt-to-Income Calculation", "category": "Financial"},
        {"item": "Property Appraisal", "category": "Property"},
        {"item": "Title Search", "category": "Property"},
        {"item": "Insurance Verification", "category": "Property"},
        {"item": "Loan-to-Value Calculation", "category": "Risk"},
        {"item": "Assumption Agreement Review", "category": "Legal"},
        {"item": "Original Loan Terms Review", "category": "Legal"},
        {"item": "Regulatory Compliance Check", "category": "Compliance"},
    ]

    def run_checklist(
        self,
        application_id: str,
        loan_amount: float,
        customer_name: str,
    ) -> Dict[str, Any]:
        """Run the underwriting checklist."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Checklist service unavailable",
            }

        # Simulate checklist completion
        checklist_results = []
        all_passed = True

        for item in self.CHECKLIST_ITEMS:
            passed = random.random() > 0.1  # 90% pass rate per item
            if not passed:
                all_passed = False

            checklist_results.append({
                "item": item["item"],
                "category": item["category"],
                "status": "passed" if passed else "failed",
                "notes": None if passed else f"Issue found with {item['item'].lower()}",
                "checked_at": self._timestamp(),
            })

        response = {
            "success": True,
            "checklist_id": self._generate_id("CHKL_"),
            "application_id": application_id,
            "results": checklist_results,
            "items_passed": sum(1 for r in checklist_results if r["status"] == "passed"),
            "items_failed": sum(1 for r in checklist_results if r["status"] == "failed"),
            "total_items": len(checklist_results),
            "all_passed": all_passed,
            "completed_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="Underwriting",
            endpoint="/checklist",
            method="POST",
            request_data={
                "loan_amount": loan_amount,
                "customer_name": customer_name,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def assign_underwriter(
        self,
        application_id: str,
        loan_amount: float,
        priority: str = "normal",
    ) -> Dict[str, Any]:
        """Assign an underwriter to the application."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Assignment service unavailable",
            }

        # Select underwriter based on loan amount
        if loan_amount > 500000:
            eligible = [uw for uw in self.UNDERWRITERS if uw["level"] in ["Senior", "Lead"]]
        else:
            eligible = self.UNDERWRITERS

        selected = random.choice(eligible)

        response = {
            "success": True,
            "assignment_id": self._generate_id("ASGN_"),
            "underwriter": selected,
            "priority": priority,
            "estimated_review_days": random.randint(3, 7),
            "assigned_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="Underwriting",
            endpoint="/assign",
            method="POST",
            request_data={
                "loan_amount": loan_amount,
                "priority": priority,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def review_completeness(
        self,
        application_id: str,
        checklist_id: str,
    ) -> Dict[str, Any]:
        """Review application for completeness and readiness."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Review service unavailable",
            }

        # Simulate readiness check (80% ready rate)
        is_ready = random.random() > 0.2

        issues = []
        if not is_ready:
            possible_issues = [
                "Missing recent bank statement",
                "Income verification discrepancy",
                "Appraisal pending",
                "Title search incomplete",
                "Insurance documentation needed",
            ]
            issues = random.sample(possible_issues, k=random.randint(1, 3))

        response = {
            "success": True,
            "review_id": self._generate_id("REV_"),
            "checklist_id": checklist_id,
            "is_ready": is_ready,
            "readiness_score": random.randint(85, 100) if is_ready else random.randint(50, 84),
            "issues": issues,
            "recommendation": "proceed_to_decision" if is_ready else "address_issues",
            "reviewed_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="Underwriting",
            endpoint="/review",
            method="POST",
            request_data={"checklist_id": checklist_id},
            response_data=response,
            status_code=200,
        )

        return response

    def get_denial_reasons(
        self,
        application_id: str,
    ) -> Dict[str, Any]:
        """Get standard denial reasons for an application."""
        possible_reasons = [
            "Insufficient income to support loan payments",
            "Credit score below minimum requirements",
            "Debt-to-income ratio exceeds guidelines",
            "Employment history insufficient",
            "Property does not meet requirements",
            "Unable to verify identity or documentation",
            "Incomplete application",
        ]

        # Select 1-3 random reasons
        reasons = random.sample(possible_reasons, k=random.randint(1, 3))

        response = {
            "success": True,
            "reasons": reasons,
            "generated_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="Underwriting",
            endpoint="/denial-reasons",
            method="GET",
            request_data={
                "application_id": application_id,
                "reason_type": "standard",
                "include_regulatory_codes": True,
            },
            response_data=response,
            status_code=200,
        )

        return response
