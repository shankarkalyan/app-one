"""Mock Document Service API."""
import random
from typing import Dict, Any, List, Optional
from .base import MockAPIBase


class MockDocumentService(MockAPIBase):
    """Mock API for document generation and management."""

    # Document types
    DISCLOSURE_DOCUMENTS = [
        "Loan Estimate",
        "Closing Disclosure",
        "Privacy Notice",
        "Equal Credit Opportunity Act Notice",
        "Assumption Agreement",
    ]

    REQUIRED_DOCUMENTS = [
        "Photo ID",
        "Proof of Income",
        "Bank Statements (3 months)",
        "Tax Returns (2 years)",
        "Employment Verification",
        "Property Insurance",
        "Title Insurance Commitment",
    ]

    COMMITMENT_LETTER_SECTIONS = [
        "Loan Terms",
        "Interest Rate",
        "Monthly Payment",
        "Conditions to Close",
        "Expiration Date",
    ]

    def create_disclosure_package(
        self,
        application_id: str,
        customer_name: str,
        loan_amount: float,
        property_address: str,
    ) -> Dict[str, Any]:
        """Create a disclosure package for the loan."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Document generation service unavailable",
            }

        documents = []
        for doc_name in self.DISCLOSURE_DOCUMENTS:
            documents.append({
                "document_id": self._generate_id("DISC_"),
                "name": doc_name,
                "type": "disclosure",
                "status": "generated",
                "pages": random.randint(2, 15),
                "created_at": self._timestamp(),
            })

        response = {
            "success": True,
            "package_id": self._generate_id("PKG_"),
            "documents": documents,
            "total_pages": sum(d["pages"] for d in documents),
            "status": "ready",
            "created_at": self._timestamp(),
            "expires_at": None,  # Will be set when sent
        }

        self._log_call(
            application_id=application_id,
            api_name="DocumentService",
            endpoint="/disclosure-package",
            method="POST",
            request_data={
                "customer_name": customer_name,
                "loan_amount": loan_amount,
                "property_address": property_address,
            },
            response_data=response,
            status_code=201,
        )

        return response

    def check_required_documents(
        self,
        application_id: str,
        received_documents: List[str],
    ) -> Dict[str, Any]:
        """Check which required documents are missing."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Document check service unavailable",
            }

        # Simulate document check
        required = self.REQUIRED_DOCUMENTS.copy()
        received = set(received_documents)

        missing = [doc for doc in required if doc not in received]

        # Simulate some documents being received
        if not received_documents:
            # First check - simulate partial document receipt
            received_count = random.randint(3, 6)
            simulated_received = random.sample(required, k=received_count)
            missing = [doc for doc in required if doc not in simulated_received]
            received = set(simulated_received)

        response = {
            "success": True,
            "check_id": self._generate_id("CHK_"),
            "required_documents": required,
            "received_documents": list(received),
            "missing_documents": missing,
            "all_documents_received": len(missing) == 0,
            "completion_percentage": round((len(received) / len(required)) * 100, 1),
            "checked_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="DocumentService",
            endpoint="/check-documents",
            method="POST",
            request_data={"received_documents": list(received)},
            response_data=response,
            status_code=200,
        )

        return response

    def create_missing_docs_letter(
        self,
        application_id: str,
        customer_name: str,
        missing_documents: List[str],
    ) -> Dict[str, Any]:
        """Create a letter requesting missing documents."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Letter generation failed",
            }

        response = {
            "success": True,
            "letter_id": self._generate_id("LTR_"),
            "type": "missing_documents_request",
            "recipient": customer_name,
            "missing_documents": missing_documents,
            "deadline_days": 15,
            "content_preview": f"Dear {customer_name}, we are missing the following documents...",
            "created_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="DocumentService",
            endpoint="/missing-docs-letter",
            method="POST",
            request_data={
                "customer_name": customer_name,
                "missing_documents": missing_documents,
            },
            response_data=response,
            status_code=201,
        )

        return response

    def create_commitment_letter(
        self,
        application_id: str,
        customer_name: str,
        loan_amount: float,
        interest_rate: float,
        terms: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Create a commitment letter."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Commitment letter generation failed",
            }

        response = {
            "success": True,
            "letter_id": self._generate_id("CMT_"),
            "type": "commitment_letter",
            "recipient": customer_name,
            "loan_details": {
                "amount": loan_amount,
                "interest_rate": interest_rate,
                "term_years": terms.get("term_years", 30),
                "monthly_payment": round(loan_amount * (interest_rate / 12) / (1 - (1 + interest_rate / 12) ** (-30 * 12)), 2),
            },
            "conditions": [
                "Clear title search",
                "Property appraisal",
                "Final income verification",
                "Homeowner's insurance",
            ],
            "expiration_days": 30,
            "created_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="DocumentService",
            endpoint="/commitment-letter",
            method="POST",
            request_data={
                "customer_name": customer_name,
                "loan_amount": loan_amount,
                "interest_rate": interest_rate,
            },
            response_data=response,
            status_code=201,
        )

        return response

    def create_denial_letter(
        self,
        application_id: str,
        customer_name: str,
        denial_reasons: List[str],
    ) -> Dict[str, Any]:
        """Create a denial letter."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Denial letter generation failed",
            }

        response = {
            "success": True,
            "letter_id": self._generate_id("DNY_"),
            "type": "denial_letter",
            "recipient": customer_name,
            "denial_reasons": denial_reasons,
            "appeal_info": {
                "can_appeal": True,
                "appeal_deadline_days": 60,
                "appeal_contact": "appeals@loanservices.example.com",
            },
            "regulatory_notices": [
                "Equal Credit Opportunity Act Notice",
                "Fair Credit Reporting Act Notice",
            ],
            "created_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="DocumentService",
            endpoint="/denial-letter",
            method="POST",
            request_data={
                "customer_name": customer_name,
                "denial_reasons": denial_reasons,
            },
            response_data=response,
            status_code=201,
        )

        return response

    def create_closing_packet(
        self,
        application_id: str,
        customer_name: str,
        loan_amount: float,
        property_address: str,
    ) -> Dict[str, Any]:
        """Create a complete closing packet."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Closing packet generation failed",
            }

        closing_documents = [
            {"name": "Closing Disclosure", "document_id": self._generate_id("CLS_"), "pages": 5},
            {"name": "Promissory Note", "document_id": self._generate_id("CLS_"), "pages": 3},
            {"name": "Deed of Trust", "document_id": self._generate_id("CLS_"), "pages": 15},
            {"name": "Assumption Agreement", "document_id": self._generate_id("CLS_"), "pages": 8},
            {"name": "Title Insurance Policy", "document_id": self._generate_id("CLS_"), "pages": 20},
            {"name": "Escrow Instructions", "document_id": self._generate_id("CLS_"), "pages": 4},
        ]

        response = {
            "success": True,
            "packet_id": self._generate_id("CPKT_"),
            "documents": closing_documents,
            "total_pages": sum(d["pages"] for d in closing_documents),
            "loan_details": {
                "amount": loan_amount,
                "property_address": property_address,
                "customer_name": customer_name,
            },
            "status": "ready",
            "created_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="DocumentService",
            endpoint="/closing-packet",
            method="POST",
            request_data={
                "customer_name": customer_name,
                "loan_amount": loan_amount,
                "property_address": property_address,
            },
            response_data=response,
            status_code=201,
        )

        return response
