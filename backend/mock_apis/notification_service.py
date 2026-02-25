"""Mock Notification Service API."""
import random
from typing import Dict, Any, List, Optional
from .base import MockAPIBase


class MockNotificationService(MockAPIBase):
    """Mock API for sending notifications (email, SMS, mail)."""

    NOTIFICATION_TYPES = [
        "ineligible_notice",
        "incomplete_closure",
        "missing_documents_request",
        "commitment_letter",
        "denial_letter",
        "closing_packet",
        "customer_withdrawn",
        "status_update",
    ]

    DELIVERY_METHODS = ["email", "sms", "mail", "portal"]

    def send_notification(
        self,
        application_id: str,
        notification_type: str,
        recipient_name: str,
        recipient_email: str,
        subject: str,
        content: str,
        attachments: Optional[List[str]] = None,
        delivery_method: str = "email",
    ) -> Dict[str, Any]:
        """Send a notification to the customer."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Notification service unavailable",
            }

        notification_id = self._generate_id("NOTIF_")

        response = {
            "success": True,
            "notification_id": notification_id,
            "type": notification_type,
            "recipient": {
                "name": recipient_name,
                "email": recipient_email,
            },
            "delivery_method": delivery_method,
            "subject": subject,
            "content_preview": content[:200] + "..." if len(content) > 200 else content,
            "attachments": attachments or [],
            "status": "sent",
            "sent_at": self._timestamp(),
            "tracking": {
                "tracking_id": self._generate_id("TRK_"),
                "delivery_status": "delivered" if random.random() > 0.05 else "pending",
            },
        }

        self._log_call(
            application_id=application_id,
            api_name="NotificationService",
            endpoint="/send",
            method="POST",
            request_data={
                "type": notification_type,
                "recipient_email": recipient_email,
                "subject": subject,
                "delivery_method": delivery_method,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def send_ineligible_letter(
        self,
        application_id: str,
        customer_name: str,
        customer_email: str,
        reasons: List[str],
    ) -> Dict[str, Any]:
        """Send ineligibility notification."""
        subject = "Loan Assumption Application - Ineligibility Notice"
        content = f"""Dear {customer_name},

We regret to inform you that your loan assumption application has been determined ineligible.

Reasons:
{chr(10).join(f"- {reason}" for reason in reasons)}

If you have any questions, please contact our customer service department.

Sincerely,
Loan Services Team"""

        return self.send_notification(
            application_id=application_id,
            notification_type="ineligible_notice",
            recipient_name=customer_name,
            recipient_email=customer_email,
            subject=subject,
            content=content,
        )

    def send_incomplete_closure(
        self,
        application_id: str,
        customer_name: str,
        customer_email: str,
        days_elapsed: int,
    ) -> Dict[str, Any]:
        """Send incomplete application closure notice."""
        subject = "Loan Assumption Application - Closure Notice"
        content = f"""Dear {customer_name},

Your loan assumption application has been closed due to incomplete documentation.

Days since application sent: {days_elapsed}

You may reapply when you have all required documentation ready.

Sincerely,
Loan Services Team"""

        return self.send_notification(
            application_id=application_id,
            notification_type="incomplete_closure",
            recipient_name=customer_name,
            recipient_email=customer_email,
            subject=subject,
            content=content,
        )

    def send_customer_withdrawn(
        self,
        application_id: str,
        customer_name: str,
        customer_email: str,
    ) -> Dict[str, Any]:
        """Send customer withdrawal notification."""
        subject = "Loan Assumption Application - Withdrawn"
        content = f"""Dear {customer_name},

Your loan assumption application has been withdrawn due to non-receipt of required documents.

If you wish to proceed with the assumption, please contact us to restart the process.

Sincerely,
Loan Services Team"""

        return self.send_notification(
            application_id=application_id,
            notification_type="customer_withdrawn",
            recipient_name=customer_name,
            recipient_email=customer_email,
            subject=subject,
            content=content,
        )

    def send_document_to_customer(
        self,
        application_id: str,
        customer_name: str,
        customer_email: str,
        document_type: str,
        document_id: str,
    ) -> Dict[str, Any]:
        """Send a document to the customer."""
        subject_map = {
            "commitment_letter": "Your Loan Commitment Letter",
            "denial_letter": "Loan Decision Notice",
            "missing_documents": "Documents Required for Your Application",
            "closing_packet": "Closing Documents for Review",
        }

        subject = subject_map.get(document_type, f"Document: {document_type}")
        content = f"""Dear {customer_name},

Please find attached the {document_type.replace('_', ' ')} for your loan assumption application.

Please review the attached document carefully. If you have any questions, please contact us.

Sincerely,
Loan Services Team"""

        return self.send_notification(
            application_id=application_id,
            notification_type=document_type,
            recipient_name=customer_name,
            recipient_email=customer_email,
            subject=subject,
            content=content,
            attachments=[document_id],
        )

    def notify_title_agency(
        self,
        application_id: str,
        title_agency_name: str,
        title_agency_email: str,
        closing_packet_id: str,
        closing_date: str,
    ) -> Dict[str, Any]:
        """Send closing packet to title agency."""
        subject = f"Closing Packet - Application {application_id}"
        content = f"""Dear {title_agency_name},

Please find attached the closing packet for loan assumption application {application_id}.

Scheduled closing date: {closing_date}

Please review and confirm receipt.

Sincerely,
Loan Services Team"""

        return self.send_notification(
            application_id=application_id,
            notification_type="closing_packet",
            recipient_name=title_agency_name,
            recipient_email=title_agency_email,
            subject=subject,
            content=content,
            attachments=[closing_packet_id],
        )
