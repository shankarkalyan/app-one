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
