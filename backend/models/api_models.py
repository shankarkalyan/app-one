"""Pydantic models for API requests and responses."""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================
# Request Models
# ============================================

class LoanApplicationRequest(BaseModel):
    """Request to create a new loan application."""
    customer_name: str = Field(..., min_length=2, max_length=200)
    customer_email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    customer_phone: str = Field(..., min_length=10, max_length=20)
    ssn_last_four: str = Field(..., min_length=4, max_length=4, pattern=r'^\d{4}$')
    property_address: str = Field(..., min_length=10, max_length=500)
    loan_amount: float = Field(..., gt=0)
    original_borrower: str = Field(..., min_length=2, max_length=200)
    simulation_type: Optional[str] = Field(None, pattern=r'^(denied|in_progress|loan_closed)$')


class HumanDecisionRequest(BaseModel):
    """Request to submit a human decision."""
    decision: str = Field(..., pattern=r'^(yes|no|approve|reject)$')
    decided_by: str = Field(..., min_length=2, max_length=200)
    notes: Optional[str] = None


class ManualStatusUpdateRequest(BaseModel):
    """Request to manually update task status to move to next step."""
    new_status: str = Field(..., pattern=r'^(in_progress|completed)$')
    updated_by: str = Field(..., min_length=2, max_length=200)
    reason: Optional[str] = Field(None, description="Reason for manual update")


class ManualPhaseUpdateRequest(BaseModel):
    """Request to manually update application phase/stage to move to next step."""
    target_phase: str = Field(..., description="Target phase to move to")
    target_node: Optional[str] = Field(None, description="Optional specific node within the phase")
    updated_by: str = Field(..., min_length=2, max_length=200)
    reason: Optional[str] = Field(None, description="Reason for manual phase update")


class DocumentReturnRequest(BaseModel):
    """Request to mark documents as returned."""
    document_ids: List[str]
    notes: Optional[str] = None


class WorkflowActionRequest(BaseModel):
    """Generic workflow action request."""
    action: str
    data: Optional[Dict[str, Any]] = None


# ============================================
# Response Models
# ============================================

class LoanApplicationResponse(BaseModel):
    """Response for loan application operations."""
    application_id: str
    status: str
    current_phase: str
    current_node: str
    created_at: datetime
    updated_at: datetime
    message: Optional[str] = None

    class Config:
        from_attributes = True


class WorkflowStatusResponse(BaseModel):
    """Detailed workflow status response."""
    application_id: str
    status: str
    current_phase: str
    current_node: str
    end_state: Optional[str] = None

    # State summary
    eligibility_status: Optional[str] = None
    app_status: Optional[str] = None
    uw_readiness: Optional[str] = None
    uw_decision: Optional[str] = None
    msp_status: Optional[str] = None

    # Counts
    sla_days: int = 0
    sq_retry_count: int = 0
    doc_request_count: int = 0

    # Timestamps
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    # Pending human tasks
    pending_human_task: Optional[Dict[str, Any]] = None

    # Manual update tracking
    is_manual_update: Optional[bool] = False
    manual_update_by: Optional[str] = None
    manually_cleared_fields: Optional[List[str]] = None

    # In-progress simulation tracking
    is_in_progress_simulation: Optional[bool] = False
    in_progress_task: Optional[str] = None
    next_phase: Optional[str] = None
    next_node: Optional[str] = None
    awaiting_manual_update: Optional[bool] = False

    class Config:
        from_attributes = True


class AgentExecutionResponse(BaseModel):
    """Response for agent execution details."""
    id: int
    application_id: str
    agent_name: str
    agent_type: str
    phase: str
    status: str
    decision: Optional[str] = None
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None

    class Config:
        from_attributes = True


class TransactionLogResponse(BaseModel):
    """Response for transaction log entries."""
    id: int
    application_id: str
    event_type: str
    event_name: str
    description: Optional[str] = None
    source_agent: Optional[str] = None
    source_node: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class WorkflowNodeStatus(BaseModel):
    """Status of a single workflow node."""
    node_id: str
    node_name: str
    node_type: str  # AGENT, SUPERVISOR, SQ_REVIEW, NOTIFY, HUMAN_IN_LOOP, END
    phase: str
    status: str  # pending, active, completed, failed, skipped
    execution_count: int = 0
    last_execution_at: Optional[datetime] = None


class WorkflowGraphResponse(BaseModel):
    """Complete workflow graph with node statuses."""
    application_id: str
    nodes: List[WorkflowNodeStatus]
    current_node: str
    workflow_status: str
    phase_summary: Dict[str, str]  # phase -> status


class ApplicationListResponse(BaseModel):
    """Response for listing applications."""
    applications: List[LoanApplicationResponse]
    total: int
    page: int
    page_size: int


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


# ============================================
# Specialist System Models
# ============================================

class SpecialistLoginRequest(BaseModel):
    """Request to login as a specialist."""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4)


class SpecialistLoginResponse(BaseModel):
    """Response after successful login."""
    specialist_id: int
    username: str
    full_name: str
    specialty_type: str
    role: str
    token: str


class CreateSpecialistRequest(BaseModel):
    """Request to create a new specialist."""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=200)
    email: Optional[str] = None
    # Legacy single specialty type (optional, for backward compatibility)
    specialty_type: Optional[str] = Field(None, pattern=r'^(INTAKE|APPLICATION|DISCLOSURE|LOAN_REVIEW|UNDERWRITING|COMMITMENT|CLOSING|POST_CLOSING|NOT_ALLOCATED)$')
    # New: multiple specialty types
    specialty_types: Optional[List[str]] = Field(default_factory=list)
    role: str = Field(default="specialist", pattern=r'^(specialist|admin)$')


class UpdateSpecialistRequest(BaseModel):
    """Request to update a specialist."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    # Legacy single specialty type (for backward compatibility)
    specialty_type: Optional[str] = None
    # New: multiple specialty types
    specialty_types: Optional[List[str]] = None
    # Dual-phase assignment
    dual_phase: Optional[bool] = None
    dual_phases: Optional[List[str]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    role: Optional[str] = None


class SpecialistResponse(BaseModel):
    """Response for specialist information."""
    id: int
    username: str
    full_name: str
    email: Optional[str]
    specialty_type: str  # Legacy field - primary/first specialty or "NOT_ALLOCATED"
    specialty_types: List[str] = []  # New: all specialty types
    dual_phase: bool = False  # Whether specialist is assigned to two phases simultaneously
    dual_phases: List[str] = []  # The two phases when dual_phase is True
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    pending_tasks_count: int = 0
    in_progress_tasks_count: int = 0

    class Config:
        from_attributes = True


class SpecialistTaskResponse(BaseModel):
    """Response for specialist task information."""
    id: int
    application_id: str
    specialist_id: Optional[int]
    specialist_name: Optional[str]
    phase: str
    task_title: str
    task_description: Optional[str]
    priority: int
    status: str
    created_at: datetime
    assigned_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    due_date: Optional[datetime]
    # Application context
    customer_name: Optional[str] = None
    loan_amount: Optional[float] = None
    current_workflow_phase: Optional[str] = None

    class Config:
        from_attributes = True


class CompleteTaskRequest(BaseModel):
    """Request to complete a task."""
    notes: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class CreateWorkflowTaskRequest(BaseModel):
    """Request to create a workflow task."""
    name: str
    phase_code: str
    description: Optional[str] = None
    color: str = "#0a4b94"
    icon: Optional[str] = None
    default_specialist_id: Optional[int] = None  # Specialist to auto-allocate to this phase


class UpdateWorkflowTaskRequest(BaseModel):
    """Request to update a workflow task."""
    name: Optional[str] = None
    phase_code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order_index: Optional[int] = None
    sla_hours: Optional[float] = None


class CreateSubtaskRequest(BaseModel):
    """Request to create a subtask."""
    name: str
    description: Optional[str] = None
    default_specialist_id: Optional[int] = None
    estimated_duration: int = 30
    sla_hours: Optional[float] = None  # SLA in hours (e.g., 4.0 for 4 hours)
    is_required: bool = True


class UpdateSubtaskRequest(BaseModel):
    """Request to update a subtask."""
    name: Optional[str] = None
    description: Optional[str] = None
    default_specialist_id: Optional[int] = None
    estimated_duration: Optional[int] = None
    sla_hours: Optional[float] = None  # SLA in hours
    is_required: Optional[bool] = None
    order_index: Optional[int] = None


class UpdateTaskSLARequest(BaseModel):
    """Request to update SLA for a workflow task."""
    sla_hours: Optional[float] = None  # SLA in hours (e.g., 24.0 for 24 hours)


class TaskOrderItem(BaseModel):
    """Single task order item for reordering."""
    id: int
    order_index: int


class ReorderTasksRequest(BaseModel):
    """Request to reorder workflow tasks."""
    task_orders: List[TaskOrderItem]


class SubtaskOrderItem(BaseModel):
    """Single subtask order item for reordering."""
    id: int
    order_index: int


class ReorderSubtasksRequest(BaseModel):
    """Request to reorder subtasks."""
    subtask_orders: List[SubtaskOrderItem]


class CreateChecklistItemRequest(BaseModel):
    """Request to create a checklist item."""
    name: str
    description: Optional[str] = None
    activity_category: Optional[str] = None
    is_required: bool = True


class UpdateChecklistItemRequest(BaseModel):
    """Request to update a checklist item."""
    name: Optional[str] = None
    description: Optional[str] = None
    activity_category: Optional[str] = None
    is_required: Optional[bool] = None
    order_index: Optional[int] = None


class AddSubtaskNoteRequest(BaseModel):
    """Request to add a note to a subtask."""
    subtask_num: str
    note_text: str = Field(..., min_length=1, max_length=2000)


class SubtaskNoteResponse(BaseModel):
    """Response for a subtask note."""
    id: int
    task_id: int
    subtask_num: str
    note_text: str
    author_name: str
    author_id: int
    phase: str
    application_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReassignTaskRequest(BaseModel):
    """Request to reassign a task."""
    specialist_id: int


class WorkloadOverviewResponse(BaseModel):
    """Response for workload overview."""
    by_specialty: Dict[str, Dict[str, int]]
    by_specialist: List[Dict[str, Any]]
    unassigned_tasks: int


class AllocationEventRequest(BaseModel):
    """Request to create an allocation history event."""
    event_type: str  # INITIAL_ALLOCATION, REALLOCATION, TASK_REASSIGNMENT, MOVED_TO_UNALLOCATED
    specialist_id: int
    specialist_name: Optional[str] = None
    from_phase: Optional[str] = None
    to_phase: Optional[str] = None
    task_id: Optional[int] = None
    application_id: Optional[str] = None
    from_specialist_id: Optional[int] = None
    from_specialist_name: Optional[str] = None
    to_specialist_id: Optional[int] = None
    to_specialist_name: Optional[str] = None
    reason: Optional[str] = None
    reason_details: Optional[str] = None
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None


class AllocationEventResponse(BaseModel):
    """Response for allocation history event."""
    id: int
    event_type: str
    specialist_id: int
    specialist_name: Optional[str]
    from_phase: Optional[str]
    to_phase: Optional[str]
    task_id: Optional[int]
    application_id: Optional[str]
    from_specialist_id: Optional[int]
    from_specialist_name: Optional[str]
    to_specialist_id: Optional[int]
    to_specialist_name: Optional[str]
    reason: Optional[str]
    reason_details: Optional[str]
    performed_by_id: Optional[int]
    performed_by_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
