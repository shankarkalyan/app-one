"""SQLite database models for loan workflow."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class LoanApplication(Base):
    """Main loan application record."""
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), unique=True, nullable=False, index=True)

    # Customer information
    customer_name = Column(String(200))
    customer_email = Column(String(200))
    customer_phone = Column(String(50))
    property_address = Column(String(500))
    loan_amount = Column(Float)
    original_borrower = Column(String(200))

    # Status tracking
    current_phase = Column(String(50), default="INTAKE")
    current_node = Column(String(100))
    status = Column(String(50), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    end_state = Column(String(50))  # INELIGIBLE, INCOMPLETE, WITHDRAWN, DENIED, LOAN_CLOSED

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

    # Relationships
    workflow_states = relationship("WorkflowState", back_populates="application", cascade="all, delete-orphan")
    agent_executions = relationship("AgentExecution", back_populates="application", cascade="all, delete-orphan")
    transaction_logs = relationship("TransactionLog", back_populates="application", cascade="all, delete-orphan")
    specialist_tasks = relationship("SpecialistTask", back_populates="application", cascade="all, delete-orphan")


class WorkflowState(Base):
    """Stores the complete LangGraph state at each checkpoint."""
    __tablename__ = "workflow_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False)

    # State snapshot
    state_json = Column(JSON, nullable=False)
    checkpoint_name = Column(String(100))
    phase = Column(String(50))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    application = relationship("LoanApplication", back_populates="workflow_states")


class AgentExecution(Base):
    """Records each agent execution with inputs and outputs."""
    __tablename__ = "agent_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False)

    # Agent information
    agent_name = Column(String(100), nullable=False)
    agent_type = Column(String(50))  # AGENT, SUPERVISOR, SQ_REVIEW, NOTIFY, HUMAN_IN_LOOP
    phase = Column(String(50))

    # Execution details
    input_state = Column(JSON)
    output_state = Column(JSON)
    decision = Column(String(100))  # The routing decision made

    # Status
    status = Column(String(50), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED, WAITING_HUMAN
    error_message = Column(Text)

    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)

    # Relationships
    application = relationship("LoanApplication", back_populates="agent_executions")


class TransactionLog(Base):
    """Detailed transaction log for audit trail."""
    __tablename__ = "transaction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False)

    # Event information
    event_type = Column(String(50), nullable=False)  # STATE_CHANGE, AGENT_START, AGENT_END, DECISION, ERROR, HUMAN_INPUT
    event_name = Column(String(200))
    description = Column(Text)

    # Data
    data = Column(JSON)
    previous_value = Column(JSON)
    new_value = Column(JSON)

    # Source
    source_agent = Column(String(100))
    source_node = Column(String(100))

    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    application = relationship("LoanApplication", back_populates="transaction_logs")


class HumanTask(Base):
    """Tasks requiring human intervention."""
    __tablename__ = "human_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False)

    # Task details
    task_type = Column(String(50), nullable=False)  # UNDERWRITING_DECISION, DENIAL_APPROVAL, SQ_ESCALATION
    task_description = Column(Text)
    checkpoint = Column(String(100))

    # Input for human
    context_data = Column(JSON)

    # Human response
    assigned_to = Column(String(200))
    response = Column(JSON)
    decision = Column(String(50))  # YES, NO, APPROVE, REJECT, etc.
    notes = Column(Text)

    # Status
    status = Column(String(50), default="PENDING")  # PENDING, ASSIGNED, IN_PROGRESS, COMPLETED

    # Manual update tracking
    is_manual_update = Column(Boolean, default=False)
    manual_update_by = Column(String(200))
    manual_update_reason = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime)
    completed_at = Column(DateTime)


class MockAPICall(Base):
    """Records all mock API calls for debugging."""
    __tablename__ = "mock_api_calls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), index=True)

    # API details
    api_name = Column(String(100), nullable=False)
    endpoint = Column(String(200))
    method = Column(String(10))

    # Request/Response
    request_data = Column(JSON)
    response_data = Column(JSON)
    status_code = Column(Integer)

    # Timing
    timestamp = Column(DateTime, default=datetime.utcnow)
    duration_ms = Column(Integer)


# ============================================
# Specialist System Models
# ============================================

# Specialty types - one for each phase (HUMAN_DECISION uses UNDERWRITING)
SPECIALTY_TYPES = [
    "INTAKE",
    "APPLICATION",
    "DISCLOSURE",
    "LOAN_REVIEW",
    "UNDERWRITING",
    "COMMITMENT",
    "CLOSING",
    "POST_CLOSING",
]

# Map phases to specialty types
PHASE_TO_SPECIALTY = {
    "INTAKE": "INTAKE",
    "APPLICATION": "APPLICATION",
    "DISCLOSURE": "DISCLOSURE",
    "LOAN_REVIEW": "LOAN_REVIEW",
    "UNDERWRITING": "UNDERWRITING",
    "HUMAN_DECISION": "UNDERWRITING",  # Same specialist handles both
    "COMMITMENT": "COMMITMENT",
    "CLOSING": "CLOSING",
    "POST_CLOSING": "POST_CLOSING",
}


class Specialist(Base):
    """Specialist user for handling workflow tasks."""
    __tablename__ = "specialists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)  # bcrypt hashed
    full_name = Column(String(200), nullable=False)
    email = Column(String(200))

    # Specialty types - multiple phases a specialist can handle (stored as JSON list)
    # Legacy field kept for backward compatibility - will be migrated to specialty_types
    specialty_type = Column(String(50), nullable=True)
    # New field: JSON list of specialty types
    # Values: ["INTAKE", "APPLICATION", "DISCLOSURE", "LOAN_REVIEW", "UNDERWRITING", "COMMITMENT", "CLOSING", "POST_CLOSING"]
    # Empty list or ["NOT_ALLOCATED"] means not allocated to any phase
    specialty_types = Column(JSON, default=list)

    # Dual-phase assignment: when a specialist works in two phases simultaneously
    dual_phase = Column(Boolean, default=False)
    dual_phases = Column(JSON, default=list)  # List of two phases when dual_phase is True

    # Role: specialist or admin
    role = Column(String(50), default="specialist")  # specialist, admin

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime)

    # Relationships
    assigned_tasks = relationship("SpecialistTask", back_populates="specialist")


class SpecialistTask(Base):
    """Task assigned to a specialist for a specific phase."""
    __tablename__ = "specialist_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), ForeignKey("loan_applications.application_id"), nullable=False)
    specialist_id = Column(Integer, ForeignKey("specialists.id"), nullable=True)  # null = unassigned

    # Task details
    phase = Column(String(50), nullable=False)  # Which phase this task is for
    task_title = Column(String(200), nullable=False)
    task_description = Column(Text)

    # Priority (1=highest, 5=lowest)
    priority = Column(Integer, default=3)

    # Status: PENDING (waiting for previous phase), READY (can be worked on),
    # ASSIGNED, IN_PROGRESS, COMPLETED, SKIPPED
    status = Column(String(50), default="PENDING")

    # Completion data
    completion_notes = Column(Text)
    completion_data = Column(JSON)  # Any data from completion

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)

    # Relationships
    specialist = relationship("Specialist", back_populates="assigned_tasks")
    application = relationship("LoanApplication", back_populates="specialist_tasks")
    subtask_notes = relationship("SubtaskNote", back_populates="task", cascade="all, delete-orphan")


class SubtaskNote(Base):
    """Notes added by specialists to subtasks within a task."""
    __tablename__ = "subtask_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("specialist_tasks.id"), nullable=False)
    subtask_num = Column(String(10), nullable=False)  # e.g., "01", "02"
    note_text = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("specialists.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("SpecialistTask", back_populates="subtask_notes")
    author = relationship("Specialist")


# ============================================
# Workflow Definition Models
# ============================================

class WorkflowTaskDefinition(Base):
    """Defines a workflow task/phase (e.g., 'Intake & Eligibility')."""
    __tablename__ = "workflow_task_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    phase_code = Column(String(50), nullable=False, unique=True)  # e.g., "INTAKE", "APPLICATION"

    # Display order
    order_index = Column(Integer, default=0)

    # SLA (Service Level Agreement) in hours
    sla_hours = Column(Float, nullable=True)  # e.g., 24.0 for 24 hours, 2.5 for 2.5 hours

    # Styling
    color = Column(String(20), default="#0a4b94")  # Chase blue default
    icon = Column(String(50))  # Icon name for UI

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("specialists.id"), nullable=True)

    # Relationships
    subtasks = relationship("SubTaskDefinition", back_populates="parent_task", cascade="all, delete-orphan", order_by="SubTaskDefinition.order_index")


class SubTaskDefinition(Base):
    """Defines a sub-task within a workflow task (e.g., 'Call Received')."""
    __tablename__ = "subtask_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("workflow_task_definitions.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)

    # Display order within parent task
    order_index = Column(Integer, default=0)

    # Default specialist assignment (optional - can be assigned at runtime)
    default_specialist_id = Column(Integer, ForeignKey("specialists.id"), nullable=True)

    # Estimated duration in minutes
    estimated_duration = Column(Integer, default=30)

    # SLA (Service Level Agreement) in hours
    sla_hours = Column(Float, nullable=True)  # e.g., 4.0 for 4 hours, 0.5 for 30 minutes

    # Is this subtask required or optional?
    is_required = Column(Boolean, default=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent_task = relationship("WorkflowTaskDefinition", back_populates="subtasks")
    default_specialist = relationship("Specialist", foreign_keys=[default_specialist_id])
    checklist_items = relationship("ChecklistItemDefinition", back_populates="parent_subtask", cascade="all, delete-orphan", order_by="ChecklistItemDefinition.order_index")


class ChecklistItemDefinition(Base):
    """Defines a checklist item under a sub-task."""
    __tablename__ = "checklist_item_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subtask_id = Column(Integer, ForeignKey("subtask_definitions.id"), nullable=False)
    name = Column(String(300), nullable=False)
    description = Column(Text)

    # Display order within parent subtask
    order_index = Column(Integer, default=0)

    # Is this checklist item required?
    is_required = Column(Boolean, default=True)

    # Activity log category for tracking
    activity_category = Column(String(100))  # e.g., "VERIFICATION", "DOCUMENTATION", "REVIEW"

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent_subtask = relationship("SubTaskDefinition", back_populates="checklist_items")


class AllocationHistory(Base):
    """Tracks specialist allocation and reallocation events."""
    __tablename__ = "allocation_history"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Event type: INITIAL_ALLOCATION, REALLOCATION, TASK_REASSIGNMENT, MOVED_TO_UNALLOCATED
    event_type = Column(String(50), nullable=False)

    # Specialist being moved/allocated
    specialist_id = Column(Integer, ForeignKey("specialists.id"), nullable=False)
    specialist_name = Column(String(200))  # Denormalized for history

    # Phase changes (for specialist allocation)
    from_phase = Column(String(50))  # Previous phase (null for initial allocation)
    to_phase = Column(String(50))  # New phase (null/empty for NOT_ALLOCATED)

    # Task reassignment details (optional)
    task_id = Column(Integer, ForeignKey("specialist_tasks.id"), nullable=True)
    application_id = Column(String(50), nullable=True)
    from_specialist_id = Column(Integer, nullable=True)
    from_specialist_name = Column(String(200), nullable=True)
    to_specialist_id = Column(Integer, nullable=True)
    to_specialist_name = Column(String(200), nullable=True)

    # Reason for reallocation
    reason = Column(String(100))  # e.g., "Sick Leave", "Vacation", "Workload Balancing"
    reason_details = Column(Text)  # Additional notes

    # Who performed the action
    performed_by_id = Column(Integer, ForeignKey("specialists.id"), nullable=True)
    performed_by_name = Column(String(200))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    specialist = relationship("Specialist", foreign_keys=[specialist_id])
    performed_by = relationship("Specialist", foreign_keys=[performed_by_id])
