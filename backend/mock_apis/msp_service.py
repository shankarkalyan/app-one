"""Mock MSP (Mortgage Servicing Platform) Service API."""
import random
from typing import Dict, Any, List
from .base import MockAPIBase


class MockMSPService(MockAPIBase):
    """Mock API for MSP system maintenance operations."""

    MAINTENANCE_TASKS = [
        {"task": "Update borrower information", "category": "borrower"},
        {"task": "Transfer loan ownership", "category": "loan"},
        {"task": "Update payment schedule", "category": "payment"},
        {"task": "Update insurance information", "category": "insurance"},
        {"task": "Update tax escrow", "category": "escrow"},
        {"task": "Generate welcome letter", "category": "communication"},
        {"task": "Set up auto-pay", "category": "payment"},
        {"task": "Archive assumption documents", "category": "documents"},
        {"task": "Update servicer records", "category": "servicer"},
        {"task": "Close original borrower account", "category": "borrower"},
    ]

    def start_maintenance(
        self,
        application_id: str,
        loan_number: str,
        new_borrower_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Start MSP system maintenance for loan assumption."""
        if self._should_fail():
            return {
                "success": False,
                "error": "MSP service unavailable",
            }

        maintenance_id = self._generate_id("MSP_")

        # Create task list
        tasks = []
        for task_info in self.MAINTENANCE_TASKS:
            tasks.append({
                "task_id": self._generate_id("TASK_"),
                "task": task_info["task"],
                "category": task_info["category"],
                "status": "pending",
            })

        response = {
            "success": True,
            "maintenance_id": maintenance_id,
            "loan_number": loan_number,
            "new_borrower": new_borrower_info.get("name", "Unknown"),
            "tasks": tasks,
            "total_tasks": len(tasks),
            "status": "in_progress",
            "started_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="MSPService",
            endpoint="/maintenance/start",
            method="POST",
            request_data={
                "loan_number": loan_number,
                "new_borrower_info": new_borrower_info,
            },
            response_data=response,
            status_code=200,
        )

        return response

    def check_maintenance_status(
        self,
        application_id: str,
        maintenance_id: str,
    ) -> Dict[str, Any]:
        """Check the status of MSP maintenance."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Status check failed",
            }

        # Simulate task completion progress
        tasks = []
        completed_count = 0

        for task_info in self.MAINTENANCE_TASKS:
            # 80% chance each task is complete
            is_complete = random.random() > 0.2
            if is_complete:
                completed_count += 1

            tasks.append({
                "task_id": self._generate_id("TASK_"),
                "task": task_info["task"],
                "category": task_info["category"],
                "status": "completed" if is_complete else "in_progress",
                "completed_at": self._timestamp() if is_complete else None,
            })

        all_complete = completed_count == len(tasks)

        response = {
            "success": True,
            "maintenance_id": maintenance_id,
            "tasks": tasks,
            "completed_tasks": completed_count,
            "total_tasks": len(tasks),
            "completion_percentage": round((completed_count / len(tasks)) * 100, 1),
            "status": "complete" if all_complete else "in_progress",
            "all_tasks_complete": all_complete,
            "checked_at": self._timestamp(),
        }

        if all_complete:
            response["completed_at"] = self._timestamp()

        self._log_call(
            application_id=application_id,
            api_name="MSPService",
            endpoint=f"/maintenance/{maintenance_id}/status",
            method="GET",
            request_data={"maintenance_id": maintenance_id},
            response_data=response,
            status_code=200,
        )

        return response

    def complete_maintenance(
        self,
        application_id: str,
        maintenance_id: str,
    ) -> Dict[str, Any]:
        """Force complete all maintenance tasks."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Completion failed",
            }

        tasks = []
        for task_info in self.MAINTENANCE_TASKS:
            tasks.append({
                "task_id": self._generate_id("TASK_"),
                "task": task_info["task"],
                "category": task_info["category"],
                "status": "completed",
                "completed_at": self._timestamp(),
            })

        response = {
            "success": True,
            "maintenance_id": maintenance_id,
            "tasks": tasks,
            "completed_tasks": len(tasks),
            "total_tasks": len(tasks),
            "status": "complete",
            "all_tasks_complete": True,
            "completed_at": self._timestamp(),
            "confirmation_number": self._generate_id("MSP_CONF_"),
        }

        self._log_call(
            application_id=application_id,
            api_name="MSPService",
            endpoint=f"/maintenance/{maintenance_id}/complete",
            method="POST",
            request_data={"maintenance_id": maintenance_id},
            response_data=response,
            status_code=200,
        )

        return response

    def review_closing_packet(
        self,
        application_id: str,
        closing_packet_id: str,
    ) -> Dict[str, Any]:
        """Review closing packet for completeness."""
        if self._should_fail():
            return {
                "success": False,
                "error": "Review service unavailable",
            }

        # Simulate review (90% pass rate)
        passed = random.random() > 0.1

        issues = []
        if not passed:
            possible_issues = [
                "Missing notary signature on deed",
                "Incorrect loan amount on closing disclosure",
                "Property address mismatch",
                "Missing witness signature",
                "Date discrepancy on documents",
            ]
            issues = random.sample(possible_issues, k=random.randint(1, 2))

        response = {
            "success": True,
            "review_id": self._generate_id("REV_"),
            "closing_packet_id": closing_packet_id,
            "review_passed": passed,
            "issues": issues,
            "documents_reviewed": [
                "Closing Disclosure",
                "Promissory Note",
                "Deed of Trust",
                "Assumption Agreement",
                "Title Insurance Policy",
            ],
            "reviewed_at": self._timestamp(),
        }

        self._log_call(
            application_id=application_id,
            api_name="MSPService",
            endpoint="/review-closing",
            method="POST",
            request_data={"closing_packet_id": closing_packet_id},
            response_data=response,
            status_code=200,
        )

        return response
