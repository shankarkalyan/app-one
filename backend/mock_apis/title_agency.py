"""Mock Title Agency API."""
import random
from datetime import datetime, timedelta
from typing import Dict, Any
from .base import MockAPIBase


class MockTitleAgencyAPI(MockAPIBase):
    """Mock API for title agency interactions."""

    TITLE_AGENCIES = [
        {"id": "TA001", "name": "First American Title", "email": "closings@firstam.example.com"},
        {"id": "TA002", "name": "Chicago Title", "email": "closings@chicago.example.com"},
        {"id": "TA003", "name": "Fidelity National Title", "email": "closings@fidelity.example.com"},
        {"id": "TA004", "name": "Stewart Title", "email": "closings@stewart.example.com"},
        {"id": "TA005", "name": "Old Republic Title", "email": "closings@oldrepublic.example.com"},
    ]

    def assign_title_agency(
        self,
        application_id: str,
        property_address: str,
        property_state: str = None,
    ) -> Dict[str, Any]:
        """Assign a title agency for closing."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Title agency assignment service unavailable",
            }

        agency = random.choice(self.TITLE_AGENCIES)

        # Generate a closing date 2-4 weeks out
        closing_date = datetime.utcnow() + timedelta(days=random.randint(14, 28))

        response = {
            "success": True,
            "assignment_id": self._generate_id("TAS_"),
            "title_agency": agency,
            "property_address": property_address,
            "scheduled_closing_date": closing_date.strftime("%Y-%m-%d"),
            "closing_time": f"{random.randint(9, 16)}:00",
            "assigned_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="TitleAgency",
            endpoint="/assign",
            method="POST",
            request_data={
                "property_address": property_address,
                "property_state": property_state,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def send_closing_packet(
        self,
        application_id: str,
        title_agency_id: str,
        closing_packet_id: str,
        closing_date: str,
    ) -> Dict[str, Any]:
        """Send closing packet to title agency."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Failed to send closing packet",
            }

        agency = next(
            (a for a in self.TITLE_AGENCIES if a["id"] == title_agency_id),
            self.TITLE_AGENCIES[0]
        )

        response = {
            "success": True,
            "transmission_id": self._generate_id("TRANS_"),
            "title_agency": agency,
            "closing_packet_id": closing_packet_id,
            "closing_date": closing_date,
            "status": "received",
            "confirmation_number": self._generate_id("CONF_"),
            "sent_at": self._timestamp(),
            "acknowledged_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="TitleAgency",
            endpoint="/send-packet",
            method="POST",
            request_data={
                "title_agency_id": title_agency_id,
                "closing_packet_id": closing_packet_id,
                "closing_date": closing_date,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def get_closing_status(
        self,
        application_id: str,
        transmission_id: str,
    ) -> Dict[str, Any]:
        """Get the status of a closing."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Status check failed",
            }

        # Simulate closing status
        statuses = ["scheduled", "in_progress", "completed", "documents_signed"]
        status = random.choices(statuses, weights=[20, 30, 30, 20], k=1)[0]

        response = {
            "success": True,
            "transmission_id": transmission_id,
            "closing_status": status,
            "documents_signed": status in ["completed", "documents_signed"],
            "funds_disbursed": status == "completed",
            "recording_status": "recorded" if status == "completed" else "pending",
            "updated_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="TitleAgency",
            endpoint=f"/status/{transmission_id}",
            method="GET",
            request_data={"transmission_id": transmission_id},
            response_data=response,
            status_code=200,
        )

        return response
