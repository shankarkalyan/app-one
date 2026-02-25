"""LangGraph State definitions for the Loan Workflow."""
from typing import TypedDict, Annotated, Optional, List, Dict, Any, Literal
from datetime import datetime
from operator import add
from pydantic import BaseModel


# ============================================
# Supporting Data Models
# ============================================

class CustomerProfile(BaseModel):
    """Customer information model."""
    name: str
    email: str
    phone: str
    ssn_last_four: str
    is_authorized: bool = False
    authorization_method: Optional[str] = None


class DisclosurePackage(BaseModel):
    """Disclosure documents package."""
    document_ids: List[str] = []
    created_at: Optional[str] = None
    sent_at: Optional[str] = None
    signed_at: Optional[str] = None
    status: str = "pending"


class DocumentStatus(BaseModel):
    """Document collection status."""
    required_documents: List[str] = []
    received_documents: List[str] = []
    missing_documents: List[str] = []
    request_count: int = 0


class CommitmentLetter(BaseModel):
    """Commitment letter details."""
    document_id: Optional[str] = None
    terms: Dict[str, Any] = {}
    created_at: Optional[str] = None
    sent_at: Optional[str] = None


class DenialLetter(BaseModel):
    """Denial letter details."""
    document_id: Optional[str] = None
    reasons: List[str] = []
    created_at: Optional[str] = None
    approved_by: Optional[str] = None


class ClosingPacket(BaseModel):
    """Closing packet details."""
    document_ids: List[str] = []
    title_agency: Optional[str] = None
    closing_date: Optional[str] = None
    created_at: Optional[str] = None
    sent_at: Optional[str] = None


# ============================================
# Message Reducer for LangGraph
# ============================================

def add_messages(left: List[Dict], right: List[Dict]) -> List[Dict]:
    """Reducer that appends new messages to existing list."""
    if left is None:
        left = []
    if right is None:
        return left
    return left + right


# ============================================
# Main LangGraph State
# ============================================

class LoanState(TypedDict, total=False):
    """
    Shared state object for the LangGraph workflow.
    All agents read/write to this single state dict.
    """

    # ---- Core Identifiers ----
    application_id: str
    thread_id: str  # LangGraph thread identifier

    # ---- Customer Information ----
    customer_profile: Dict[str, Any]  # CustomerProfile as dict
    property_address: str
    loan_amount: float
    original_borrower: str

    # ---- Phase 1: Intake ----
    eligibility_status: Literal["pending", "eligible", "ineligible"]
    eligibility_reasons: List[str]
    case_optimizer_result: Dict[str, Any]

    # ---- Phase 2: Application ----
    app_status: Literal["pending", "sent", "returned", "complete", "incomplete"]
    docusign_envelope_id: Optional[str]
    sla_days: int
    sla_deadline: Optional[str]
    application_sent_at: Optional[str]
    application_returned_at: Optional[str]

    # ---- Phase 3: Disclosure ----
    disclosure_package: Dict[str, Any]  # DisclosurePackage as dict

    # ---- Phase 4: Loan Review & Document Collection ----
    docs_needed: bool
    doc_status: Literal["pending", "requested", "returned", "not_received", "withdrawn"]
    document_collection: Dict[str, Any]  # DocumentStatus as dict
    missing_docs_letter: Dict[str, Any]
    doc_request_count: int

    # ---- Phase 5: Underwriting ----
    uw_checklist_complete: bool
    uw_assigned_to: Optional[str]
    uw_readiness: Literal["pending", "ready", "not_ready"]
    uw_review_count: int

    # ---- Human-in-the-Loop Decision ----
    uw_decision: Optional[Literal["yes", "no"]]
    uw_decision_by: Optional[str]
    uw_decision_at: Optional[str]
    uw_decision_notes: Optional[str]

    # ---- Phase 6a: Denial ----
    denial_letter: Dict[str, Any]  # DenialLetter as dict
    denial_approved: bool

    # ---- Phase 6b: Commitment ----
    commitment_letter: Dict[str, Any]  # CommitmentLetter as dict
    call_agent_assigned: Optional[str]
    review_completed: bool

    # ---- Phase 7: Closing ----
    closing_packet: Dict[str, Any]  # ClosingPacket as dict
    title_agency_notified: bool

    # ---- Phase 8: Post-Closing ----
    closing_reviewed: bool
    msp_status: Literal["pending", "in_progress", "complete"]
    msp_completed_at: Optional[str]

    # ---- SQ Review Node State ----
    sq_review_context: Literal[
        "disclosure",
        "missing_docs",
        "commitment",
        "denial",
        "closing",
        "review_closing",
        "maintenance"
    ]
    sq_review_result: Optional[Literal["pass", "fail"]]
    sq_retry_count: int
    sq_review_notes: List[str]

    # ---- Notification State ----
    notification_type: Optional[str]
    notification_sent: bool
    notifications_history: List[Dict[str, Any]]

    # ---- Workflow Tracking ----
    current_phase: str
    current_node: str
    previous_node: Optional[str]
    workflow_status: Literal["active", "paused", "completed", "failed"]
    end_state: Optional[Literal["ineligible", "incomplete", "withdrawn", "denied", "loan_closed"]]

    # ---- Message History ----
    messages: Annotated[List[Dict[str, Any]], add_messages]

    # ---- Error Handling ----
    errors: List[Dict[str, Any]]
    last_error: Optional[str]

    # ---- Timestamps ----
    created_at: str
    updated_at: str

    # ---- Simulation Control ----
    simulation_type: Optional[Literal["denied", "in_progress", "loan_closed"]]


def create_initial_state(
    application_id: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    ssn_last_four: str,
    property_address: str,
    loan_amount: float,
    original_borrower: str,
    simulation_type: Optional[str] = None,
) -> LoanState:
    """Create an initial state for a new loan application."""
    now = datetime.utcnow().isoformat()

    return LoanState(
        # Core identifiers
        application_id=application_id,
        thread_id=f"thread_{application_id}",

        # Customer information
        customer_profile={
            "name": customer_name,
            "email": customer_email,
            "phone": customer_phone,
            "ssn_last_four": ssn_last_four,
            "is_authorized": False,
            "authorization_method": None,
        },
        property_address=property_address,
        loan_amount=loan_amount,
        original_borrower=original_borrower,

        # Phase 1
        eligibility_status="pending",
        eligibility_reasons=[],
        case_optimizer_result={},

        # Phase 2
        app_status="pending",
        docusign_envelope_id=None,
        sla_days=0,
        sla_deadline=None,
        application_sent_at=None,
        application_returned_at=None,

        # Phase 3
        disclosure_package={
            "document_ids": [],
            "created_at": None,
            "sent_at": None,
            "signed_at": None,
            "status": "pending",
        },

        # Phase 4
        docs_needed=False,
        doc_status="pending",
        document_collection={
            "required_documents": [],
            "received_documents": [],
            "missing_documents": [],
            "request_count": 0,
        },
        missing_docs_letter={},
        doc_request_count=0,

        # Phase 5
        uw_checklist_complete=False,
        uw_assigned_to=None,
        uw_readiness="pending",
        uw_review_count=0,

        # Human decision
        uw_decision=None,
        uw_decision_by=None,
        uw_decision_at=None,
        uw_decision_notes=None,

        # Phase 6a
        denial_letter={},
        denial_approved=False,

        # Phase 6b
        commitment_letter={},
        call_agent_assigned=None,
        review_completed=False,

        # Phase 7
        closing_packet={},
        title_agency_notified=False,

        # Phase 8
        closing_reviewed=False,
        msp_status="pending",
        msp_completed_at=None,

        # SQ Review
        sq_review_context="disclosure",
        sq_review_result=None,
        sq_retry_count=0,
        sq_review_notes=[],

        # Notifications
        notification_type=None,
        notification_sent=False,
        notifications_history=[],

        # Workflow tracking
        current_phase="INTAKE",
        current_node="START",
        previous_node=None,
        workflow_status="active",
        end_state=None,

        # Messages
        messages=[],

        # Errors
        errors=[],
        last_error=None,

        # Timestamps
        created_at=now,
        updated_at=now,

        # Simulation control
        simulation_type=simulation_type,
    )
