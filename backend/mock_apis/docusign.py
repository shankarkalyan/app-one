"""Mock DocuSign API for document signing."""
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from .base import MockAPIBase


class MockDocuSignAPI(MockAPIBase):
    """Mock DocuSign API for sending and tracking envelopes."""

    # Simulated envelope statuses
    STATUSES = ["sent", "delivered", "viewed", "signed", "completed", "declined", "voided"]

    def create_envelope(
        self,
        application_id: str,
        recipient_email: str,
        recipient_name: str,
        documents: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Create and send a DocuSign envelope.

        Returns:
            Envelope creation response with envelope_id
        """
        if self._should_fail():
            return {
                "success": False,
                "error": "DocuSign service temporarily unavailable",
                "error_code": "SERVICE_UNAVAILABLE",
            }

        envelope_id = self._generate_id("ENV_")

        response = {
            "success": True,
            "envelope_id": envelope_id,
            "status": "sent",
            "recipient": {
                "email": recipient_email,
                "name": recipient_name,
            },
            "documents": [
                {
                    "document_id": self._generate_id("DOC_"),
                    "name": doc.get("name", "Document"),
                    "order": idx + 1,
                }
                for idx, doc in enumerate(documents)
            ],
            "created_at": self._timestamp(),
            "sent_at": self._timestamp(),
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }

        self._log_call(
            application_id=application_id,
            api_name="DocuSign",
            endpoint="/envelopes",
            method="POST",
            request_data={
                "recipient_email": recipient_email,
                "recipient_name": recipient_name,
                "document_count": len(documents),
            },
            response_data=response,
            status_code=201,
        )

        return response

    def get_envelope_status(self, application_id: str, envelope_id: str) -> Dict[str, Any]:
        """
        Get the status of a DocuSign envelope.

        Simulates progression through signing workflow.
        """
        if self._should_fail():
            return {
                "success": False,
                "error": "Failed to retrieve envelope status",
            }

        # Simulate status progression with weighted probabilities
        status = random.choices(
            ["sent", "delivered", "viewed", "signed", "completed"],
            weights=[10, 15, 20, 25, 30],
            k=1,
        )[0]

        response = {
            "success": True,
            "envelope_id": envelope_id,
            "status": status,
            "status_changed_at": self._timestamp(),
            "completed": status == "completed",
        }

        if status in ["signed", "completed"]:
            response["signed_at"] = self._timestamp()
            response["signed_documents"] = [
                {"document_id": self._generate_id("DOC_"), "signed": True}
            ]

        self._log_call(
            application_id=application_id,
            api_name="DocuSign",
            endpoint=f"/envelopes/{envelope_id}/status",
            method="GET",
            request_data={"envelope_id": envelope_id},
            response_data=response,
            status_code=200,
        )

        return response

    def void_envelope(self, application_id: str, envelope_id: str, reason: str) -> Dict[str, Any]:
        """Void an existing envelope."""
        response = {
            "success": True,
            "envelope_id": envelope_id,
            "status": "voided",
            "voided_at": self._timestamp(),
            "void_reason": reason,
        }

        self._log_call(
            application_id=application_id,
            api_name="DocuSign",
            endpoint=f"/envelopes/{envelope_id}/void",
            method="PUT",
            request_data={"reason": reason},
            response_data=response,
            status_code=200,
        )

        return response
