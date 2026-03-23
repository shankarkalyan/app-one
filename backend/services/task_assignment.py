"""Task assignment service for automatic task creation and assignment."""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models import (
    Specialist,
    SpecialistTask,
    LoanApplication,
    WorkflowTaskDefinition,
    SPECIALTY_TYPES,
    PHASE_TO_SPECIALTY,
)


# Task descriptions for each phase
PHASE_TASK_INFO = {
    "INTAKE": {
        "title": "Intake Review",
        "description": "Verify caller identity and check loan assumption eligibility. Review customer information and property details.",
    },
    "APPLICATION": {
        "title": "Application Processing",
        "description": "Send and track the loan assumption application via DocuSign. Ensure all required fields are completed.",
    },
    "DISCLOSURE": {
        "title": "Disclosure Package",
        "description": "Create and send disclosure package to the customer. Verify all required disclosures are included.",
    },
    "LOAN_REVIEW": {
        "title": "Document Review",
        "description": "Review all submitted documents. Request any missing documents and verify completeness.",
    },
    "UNDERWRITING": {
        "title": "Underwriting Analysis",
        "description": "Complete underwriting checklist. Analyze creditworthiness and loan eligibility criteria.",
    },
    "COMMITMENT": {
        "title": "Commitment Letter",
        "description": "Generate and send commitment letter. Verify all terms and conditions are accurate.",
    },
    "CLOSING": {
        "title": "Closing Preparation",
        "description": "Prepare closing packet. Coordinate with title agency and schedule closing.",
    },
    "POST_CLOSING": {
        "title": "Post-Closing Maintenance",
        "description": "Complete MSP maintenance tasks. Update loan servicing system and finalize records.",
    },
}


class TaskAssignmentService:
    """Service for automatic task creation and assignment."""

    def __init__(self, db: Session):
        self.db = db

    def create_tasks_for_application(self, application_id: str) -> List[SpecialistTask]:
        """Create tasks for all phases when application is created."""
        tasks = []

        for i, phase in enumerate(SPECIALTY_TYPES):
            task_info = PHASE_TASK_INFO.get(phase, {})
            task = SpecialistTask(
                application_id=application_id,
                phase=phase,
                task_title=task_info.get("title", f"{phase.replace('_', ' ').title()} Review"),
                task_description=task_info.get("description", f"Complete {phase} phase tasks."),
                priority=3,  # Default priority
                status="PENDING" if i > 0 else "READY",  # First task is READY, others are PENDING
            )
            self.db.add(task)
            tasks.append(task)

        self.db.commit()

        # Auto-assign first task (INTAKE)
        if tasks:
            self.auto_assign_task(tasks[0])

        return tasks

    def auto_assign_task(self, task: SpecialistTask) -> Optional[Specialist]:
        """Assign task to specialist using round-robin (least-loaded first)."""
        specialty = PHASE_TO_SPECIALTY.get(task.phase)

        if not specialty:
            return None

        # Get all active specialists for this specialty (exclude admins)
        specialists = self.db.query(Specialist).filter(
            Specialist.specialty_type == specialty,
            Specialist.is_active == True,
            Specialist.role != "admin",  # Admins don't receive tasks
        ).all()

        if not specialists:
            # No specialists available, task remains unassigned but READY
            task.status = "READY"
            self.db.commit()
            return None

        # Round-robin: find specialist with least active tasks
        specialist_workloads = []
        for spec in specialists:
            active_count = self.db.query(SpecialistTask).filter(
                SpecialistTask.specialist_id == spec.id,
                SpecialistTask.status.in_(["ASSIGNED", "IN_PROGRESS"]),
            ).count()
            specialist_workloads.append((spec, active_count))

        # Sort by workload (ascending) and assign to least loaded
        specialist_workloads.sort(key=lambda x: x[1])
        selected_specialist = specialist_workloads[0][0]

        task.specialist_id = selected_specialist.id
        task.status = "ASSIGNED"
        task.assigned_at = datetime.utcnow()

        # Calculate due_date based on SLA from workflow task definition
        workflow_task = self.db.query(WorkflowTaskDefinition).filter(
            WorkflowTaskDefinition.phase_code == task.phase,
            WorkflowTaskDefinition.is_active == True
        ).first()

        if workflow_task and workflow_task.sla_hours:
            task.due_date = task.assigned_at + timedelta(hours=workflow_task.sla_hours)

        self.db.commit()

        return selected_specialist

    def start_task(self, task: SpecialistTask) -> SpecialistTask:
        """Mark a task as in-progress."""
        task.status = "IN_PROGRESS"
        task.started_at = datetime.utcnow()
        self.db.commit()
        return task

    def complete_task(
        self,
        task: SpecialistTask,
        notes: Optional[str] = None,
        data: Optional[dict] = None,
    ) -> SpecialistTask:
        """Complete a task and activate the next phase task."""
        task.status = "COMPLETED"
        task.completed_at = datetime.utcnow()
        task.completion_notes = notes
        task.completion_data = data
        self.db.commit()

        # Advance to next phase
        self.advance_to_next_phase(task)

        return task

    def advance_to_next_phase(self, completed_task: SpecialistTask):
        """When a task is completed, activate and assign the next phase task."""
        try:
            current_phase_index = SPECIALTY_TYPES.index(completed_task.phase)
        except ValueError:
            return  # Unknown phase

        if current_phase_index >= len(SPECIALTY_TYPES) - 1:
            return  # No more phases

        next_phase = SPECIALTY_TYPES[current_phase_index + 1]

        # Find the next task for this application
        next_task = self.db.query(SpecialistTask).filter(
            SpecialistTask.application_id == completed_task.application_id,
            SpecialistTask.phase == next_phase,
        ).first()

        if next_task and next_task.status == "PENDING":
            next_task.status = "READY"
            self.db.commit()
            self.auto_assign_task(next_task)

    def reassign_task(self, task: SpecialistTask, specialist_id: int) -> SpecialistTask:
        """Manually reassign a task to a different specialist."""
        specialist = self.db.query(Specialist).filter(Specialist.id == specialist_id).first()

        if not specialist:
            raise ValueError("Specialist not found")

        task.specialist_id = specialist_id
        task.assigned_at = datetime.utcnow()

        # If task was READY (unassigned), change to ASSIGNED
        if task.status == "READY":
            task.status = "ASSIGNED"

        self.db.commit()
        return task

    def get_specialist_stats(self, specialist_id: int) -> dict:
        """Get task statistics for a specialist."""
        pending = self.db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == specialist_id,
            SpecialistTask.status == "ASSIGNED",
        ).count()

        in_progress = self.db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == specialist_id,
            SpecialistTask.status == "IN_PROGRESS",
        ).count()

        completed_today = self.db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == specialist_id,
            SpecialistTask.status == "COMPLETED",
            func.date(SpecialistTask.completed_at) == func.date(datetime.utcnow()),
        ).count()

        total_completed = self.db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == specialist_id,
            SpecialistTask.status == "COMPLETED",
        ).count()

        # Calculate average completion time
        # Use assigned_at -> completed_at, or fallback to started_at -> completed_at, or created_at -> completed_at
        avg_completion_time_minutes = None
        completed_tasks = self.db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == specialist_id,
            SpecialistTask.status == "COMPLETED",
            SpecialistTask.completed_at != None,
        ).all()

        if completed_tasks:
            total_minutes = 0
            valid_tasks = 0
            for task in completed_tasks:
                if task.completed_at:
                    # Use assigned_at if available, otherwise started_at, otherwise created_at
                    start_time = task.assigned_at or task.started_at or task.created_at
                    if start_time:
                        delta = task.completed_at - start_time
                        total_minutes += delta.total_seconds() / 60
                        valid_tasks += 1
            if valid_tasks > 0:
                avg_completion_time_minutes = round(total_minutes / valid_tasks, 1)

        return {
            "pending": pending,
            "in_progress": in_progress,
            "completed_today": completed_today,
            "total_completed": total_completed,
            "avg_completion_time_minutes": avg_completion_time_minutes,
        }

    def get_workload_overview(self) -> dict:
        """Get workload overview across all specialists and specialties."""
        by_specialty = {}
        for specialty in SPECIALTY_TYPES:
            pending = self.db.query(SpecialistTask).filter(
                SpecialistTask.phase == specialty,
                SpecialistTask.status.in_(["READY", "ASSIGNED"]),
            ).count()

            in_progress = self.db.query(SpecialistTask).filter(
                SpecialistTask.phase == specialty,
                SpecialistTask.status == "IN_PROGRESS",
            ).count()

            completed = self.db.query(SpecialistTask).filter(
                SpecialistTask.phase == specialty,
                SpecialistTask.status == "COMPLETED",
            ).count()

            by_specialty[specialty] = {
                "pending": pending,
                "in_progress": in_progress,
                "completed": completed,
            }

        # Get stats by specialist
        specialists = self.db.query(Specialist).filter(Specialist.is_active == True).all()
        by_specialist = []
        for spec in specialists:
            stats = self.get_specialist_stats(spec.id)
            by_specialist.append({
                "id": spec.id,
                "full_name": spec.full_name,
                "specialty_type": spec.specialty_type,
                **stats,
            })

        # Count unassigned tasks
        unassigned = self.db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == None,
            SpecialistTask.status == "READY",
        ).count()

        return {
            "by_specialty": by_specialty,
            "by_specialist": by_specialist,
            "unassigned_tasks": unassigned,
        }
