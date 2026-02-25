"""FastAPI backend for Loan Assumption Workflow."""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import init_db, get_db, SessionLocal
from database.models import (
    LoanApplication,
    WorkflowState,
    AgentExecution,
    TransactionLog,
    HumanTask,
    MockAPICall,
)
from models.state import create_initial_state
from models.api_models import (
    LoanApplicationRequest,
    LoanApplicationResponse,
    WorkflowStatusResponse,
    AgentExecutionResponse,
    TransactionLogResponse,
    HumanDecisionRequest,
    ManualStatusUpdateRequest,
    ManualPhaseUpdateRequest,
    ApplicationListResponse,
    ErrorResponse,
    WorkflowGraphResponse,
    WorkflowNodeStatus,
)
from workflow import LoanWorkflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    init_db()
    print("Database initialized")
    yield
    # Shutdown
    print("Shutting down")


app = FastAPI(
    title="Loan Assumption Workflow API",
    description="API for managing loan assumption workflow using LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Application Endpoints
# ============================================

@app.post("/api/applications", response_model=LoanApplicationResponse, tags=["Applications"])
async def create_application(
    request: LoanApplicationRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new loan application and start the workflow.
    """
    # Generate unique application ID
    application_id = f"LA-{uuid.uuid4().hex[:8].upper()}"

    # Create initial state
    initial_state = create_initial_state(
        application_id=application_id,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        ssn_last_four=request.ssn_last_four,
        property_address=request.property_address,
        loan_amount=request.loan_amount,
        original_borrower=request.original_borrower,
        simulation_type=request.simulation_type,
    )

    # Create workflow and execute
    try:
        workflow = LoanWorkflow(db=db)
        result = workflow.start(initial_state)

        # Get the created application
        app_record = db.query(LoanApplication).filter_by(
            application_id=application_id
        ).first()

        if not app_record:
            raise HTTPException(status_code=500, detail="Failed to create application")

        return LoanApplicationResponse(
            application_id=application_id,
            status=app_record.status,
            current_phase=app_record.current_phase or result.get("current_phase", "UNKNOWN"),
            current_node=app_record.current_node or result.get("current_node", "UNKNOWN"),
            created_at=app_record.created_at,
            updated_at=app_record.updated_at,
            message=f"Application created and workflow started. End state: {result.get('end_state', 'In Progress')}",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/applications", response_model=ApplicationListResponse, tags=["Applications"])
async def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List all loan applications with pagination.
    """
    query = db.query(LoanApplication)

    if status:
        query = query.filter(LoanApplication.status == status.upper())

    total = query.count()

    applications = query.order_by(desc(LoanApplication.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return ApplicationListResponse(
        applications=[
            LoanApplicationResponse(
                application_id=app.application_id,
                status=app.status,
                current_phase=app.current_phase or "UNKNOWN",
                current_node=app.current_node or "UNKNOWN",
                created_at=app.created_at,
                updated_at=app.updated_at,
            )
            for app in applications
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@app.get("/api/applications/{application_id}", response_model=WorkflowStatusResponse, tags=["Applications"])
async def get_application(
    application_id: str,
    db: Session = Depends(get_db),
):
    """
    Get detailed status of a specific application.
    """
    app = db.query(LoanApplication).filter_by(application_id=application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get latest workflow state
    latest_state = db.query(WorkflowState).filter_by(
        application_id=application_id
    ).order_by(desc(WorkflowState.created_at)).first()

    state_data = latest_state.state_json if latest_state else {}

    # Check if this is a manual update - if so, show placeholder for null fields
    is_manual_update = state_data.get("is_manual_update", False)
    manually_cleared_fields = state_data.get("manually_cleared_fields", [])

    def get_field_value(field_name, default=None):
        """Return placeholder if field was manually cleared, otherwise return actual value."""
        value = state_data.get(field_name)
        if is_manual_update and field_name in manually_cleared_fields and value is None:
            return MANUAL_UPDATE_PLACEHOLDER
        return value if value is not None else default

    # Check for pending human tasks
    pending_task = db.query(HumanTask).filter_by(
        application_id=application_id,
        status="PENDING",
    ).first()

    # Check if this is an in-progress simulation awaiting manual update
    is_in_progress_simulation = state_data.get("is_in_progress_simulation", False)
    in_progress_task = state_data.get("in_progress_task")
    awaiting_manual_update = state_data.get("workflow_status") == "paused" and is_in_progress_simulation

    # Calculate next phase/node for manual progression
    next_phase = None
    next_node = None
    if awaiting_manual_update:
        current_phase = app.current_phase
        if current_phase in PHASE_ORDER:
            current_idx = PHASE_ORDER.index(current_phase)
            if current_idx < len(PHASE_ORDER) - 1:
                next_phase = PHASE_ORDER[current_idx + 1]
                next_node = PHASE_NODES.get(next_phase, [None])[0]

    return WorkflowStatusResponse(
        application_id=app.application_id,
        status=app.status,
        current_phase=app.current_phase or "UNKNOWN",
        current_node=app.current_node or "UNKNOWN",
        end_state=app.end_state,
        eligibility_status=get_field_value("eligibility_status"),
        app_status=get_field_value("app_status"),
        uw_readiness=get_field_value("uw_readiness"),
        uw_decision=get_field_value("uw_decision"),
        msp_status=get_field_value("msp_status"),
        sla_days=state_data.get("sla_days", 0),
        sq_retry_count=state_data.get("sq_retry_count", 0),
        doc_request_count=state_data.get("doc_request_count", 0),
        created_at=app.created_at,
        updated_at=app.updated_at,
        completed_at=app.completed_at,
        pending_human_task={
            "task_id": pending_task.id,
            "task_type": pending_task.task_type,
            "description": pending_task.task_description,
        } if pending_task else None,
        is_manual_update=is_manual_update,
        manual_update_by=state_data.get("manual_update_by") if is_manual_update else None,
        manually_cleared_fields=manually_cleared_fields if is_manual_update else None,
        is_in_progress_simulation=is_in_progress_simulation,
        in_progress_task=in_progress_task,
        next_phase=next_phase,
        next_node=next_node,
        awaiting_manual_update=awaiting_manual_update,
    )


# ============================================
# Workflow Graph Endpoints
# ============================================

@app.get("/api/applications/{application_id}/graph", response_model=WorkflowGraphResponse, tags=["Workflow"])
async def get_workflow_graph(
    application_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the workflow graph with node statuses for visualization.
    """
    app = db.query(LoanApplication).filter_by(application_id=application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get all agent executions
    executions = db.query(AgentExecution).filter_by(
        application_id=application_id
    ).all()

    # Build execution map
    execution_map = {}
    for ex in executions:
        if ex.agent_name not in execution_map:
            execution_map[ex.agent_name] = {
                "count": 0,
                "last_execution": None,
                "status": "pending",
            }
        execution_map[ex.agent_name]["count"] += 1
        execution_map[ex.agent_name]["last_execution"] = ex.completed_at or ex.started_at
        execution_map[ex.agent_name]["status"] = ex.status.lower()

    # Define all nodes in the workflow
    all_nodes = [
        # Phase 1: Intake
        {"id": "intake_agent", "name": "IntakeAgent", "type": "AGENT", "phase": "INTAKE"},
        # Phase 2: Application
        {"id": "application_agent", "name": "ApplicationAgent", "type": "AGENT", "phase": "APPLICATION"},
        # Phase 3: Disclosure
        {"id": "disclosure_agent", "name": "DisclosureAgent", "type": "AGENT", "phase": "DISCLOSURE"},
        {"id": "sq_review_disclosure", "name": "SQ Review (Disclosure)", "type": "SQ_REVIEW", "phase": "DISCLOSURE"},
        # Phase 4: Loan Review
        {"id": "loan_review_agent", "name": "LoanReviewAgent", "type": "AGENT", "phase": "LOAN_REVIEW"},
        {"id": "doc_letter_agent", "name": "DocLetterAgent", "type": "AGENT", "phase": "LOAN_REVIEW"},
        {"id": "sq_review_missing_docs", "name": "SQ Review (Missing Docs)", "type": "SQ_REVIEW", "phase": "LOAN_REVIEW"},
        # Phase 5: Underwriting
        {"id": "underwriting_agent", "name": "UnderwritingAgent", "type": "AGENT", "phase": "UNDERWRITING"},
        {"id": "underwriter_review_agent", "name": "UnderwriterReviewAgent", "type": "AGENT", "phase": "UNDERWRITING"},
        {"id": "human_decision", "name": "Human Decision", "type": "HUMAN_IN_LOOP", "phase": "UNDERWRITING"},
        # Phase 6a: Denial
        {"id": "denial_agent", "name": "DenialAgent", "type": "AGENT", "phase": "DENIAL"},
        {"id": "sq_review_denial", "name": "SQ Review (Denial)", "type": "SQ_REVIEW", "phase": "DENIAL"},
        # Phase 6b: Commitment
        {"id": "commitment_agent", "name": "CommitmentAgent", "type": "AGENT", "phase": "COMMITMENT"},
        {"id": "sq_review_commitment", "name": "SQ Review (Commitment)", "type": "SQ_REVIEW", "phase": "COMMITMENT"},
        {"id": "call_agent", "name": "CallAgent", "type": "AGENT", "phase": "COMMITMENT"},
        {"id": "review_agent", "name": "ReviewAgent", "type": "AGENT", "phase": "COMMITMENT"},
        # Phase 7: Closing
        {"id": "closing_packet_agent", "name": "ClosingPacketAgent", "type": "AGENT", "phase": "CLOSING"},
        {"id": "sq_review_closing", "name": "SQ Review (Closing)", "type": "SQ_REVIEW", "phase": "CLOSING"},
        # Phase 8: Post-Closing
        {"id": "review_closing_agent", "name": "ReviewClosingAgent", "type": "AGENT", "phase": "POST_CLOSING"},
        {"id": "sq_review_review_closing", "name": "SQ Review (Review Closing)", "type": "SQ_REVIEW", "phase": "POST_CLOSING"},
        {"id": "maintenance_agent", "name": "MaintenanceAgent", "type": "AGENT", "phase": "POST_CLOSING"},
        {"id": "sq_review_maintenance", "name": "SQ Review (Maintenance)", "type": "SQ_REVIEW", "phase": "POST_CLOSING"},
        # Notify
        {"id": "notify_agent", "name": "NotifyAgent", "type": "NOTIFY", "phase": "NOTIFICATION"},
        # End States
        {"id": "end_ineligible", "name": "END - Ineligible", "type": "END", "phase": "END"},
        {"id": "end_incomplete", "name": "END - Incomplete", "type": "END", "phase": "END"},
        {"id": "end_withdrawn", "name": "END - Withdrawn", "type": "END", "phase": "END"},
        {"id": "end_denied", "name": "END - Denied", "type": "END", "phase": "END"},
        {"id": "end_loan_closed", "name": "END - Loan Closed", "type": "END", "phase": "END"},
    ]

    # Build node statuses
    nodes = []
    for node_def in all_nodes:
        # Map agent names to node IDs
        agent_key = node_def["name"].replace(" ", "").replace("(", "").replace(")", "").replace("-", "")

        # Look for execution data
        exec_data = None
        for key in execution_map:
            if key.lower() == agent_key.lower() or key == node_def["name"]:
                exec_data = execution_map[key]
                break

        # Also check for SQReviewNode with context
        if "SQ Review" in node_def["name"] and "SQReviewNode" in execution_map:
            exec_data = execution_map["SQReviewNode"]

        # Determine status
        if exec_data:
            status = exec_data["status"]
            count = exec_data["count"]
            last_exec = exec_data["last_execution"]
        elif node_def["id"] == app.current_node:
            status = "active"
            count = 0
            last_exec = None
        else:
            status = "pending"
            count = 0
            last_exec = None

        nodes.append(WorkflowNodeStatus(
            node_id=node_def["id"],
            node_name=node_def["name"],
            node_type=node_def["type"],
            phase=node_def["phase"],
            status=status,
            execution_count=count,
            last_execution_at=last_exec,
        ))

    # Build phase summary
    phases = ["INTAKE", "APPLICATION", "DISCLOSURE", "LOAN_REVIEW", "UNDERWRITING",
              "DENIAL", "COMMITMENT", "CLOSING", "POST_CLOSING", "END"]

    phase_summary = {}
    current_phase_idx = phases.index(app.current_phase) if app.current_phase in phases else -1

    for idx, phase in enumerate(phases):
        if idx < current_phase_idx:
            phase_summary[phase] = "completed"
        elif idx == current_phase_idx:
            phase_summary[phase] = "active"
        else:
            phase_summary[phase] = "pending"

    return WorkflowGraphResponse(
        application_id=application_id,
        nodes=nodes,
        current_node=app.current_node or "unknown",
        workflow_status=app.status,
        phase_summary=phase_summary,
    )


# ============================================
# Agent Execution Endpoints
# ============================================

@app.get("/api/applications/{application_id}/executions", response_model=List[AgentExecutionResponse], tags=["Executions"])
async def get_agent_executions(
    application_id: str,
    agent_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Get all agent executions for an application.
    """
    query = db.query(AgentExecution).filter_by(application_id=application_id)

    if agent_name:
        query = query.filter(AgentExecution.agent_name == agent_name)

    executions = query.order_by(AgentExecution.started_at).all()

    return [
        AgentExecutionResponse(
            id=ex.id,
            application_id=ex.application_id,
            agent_name=ex.agent_name,
            agent_type=ex.agent_type or "AGENT",
            phase=ex.phase or "UNKNOWN",
            status=ex.status,
            decision=ex.decision,
            input_summary=ex.input_state,
            output_summary=ex.output_state,
            error_message=ex.error_message,
            started_at=ex.started_at,
            completed_at=ex.completed_at,
            duration_ms=ex.duration_ms,
        )
        for ex in executions
    ]


# ============================================
# Transaction Log Endpoints
# ============================================

@app.get("/api/applications/{application_id}/transactions", response_model=List[TransactionLogResponse], tags=["Transactions"])
async def get_transaction_logs(
    application_id: str,
    event_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Get transaction logs for an application.
    """
    query = db.query(TransactionLog).filter_by(application_id=application_id)

    if event_type:
        query = query.filter(TransactionLog.event_type == event_type.upper())

    logs = query.order_by(TransactionLog.timestamp).limit(limit).all()

    return [
        TransactionLogResponse(
            id=log.id,
            application_id=log.application_id,
            event_type=log.event_type,
            event_name=log.event_name,
            description=log.description,
            source_agent=log.source_agent,
            source_node=log.source_node,
            data=log.data,
            timestamp=log.timestamp,
        )
        for log in logs
    ]


# ============================================
# Human Task Endpoints
# ============================================

@app.get("/api/applications/{application_id}/human-tasks", tags=["Human Tasks"])
async def get_human_tasks(
    application_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Get human tasks for an application.
    """
    query = db.query(HumanTask).filter_by(application_id=application_id)

    if status:
        query = query.filter(HumanTask.status == status.upper())

    tasks = query.order_by(desc(HumanTask.created_at)).all()

    return [
        {
            "id": task.id,
            "application_id": task.application_id,
            "task_type": task.task_type,
            "task_description": task.task_description,
            "checkpoint": task.checkpoint,
            "context_data": task.context_data,
            "assigned_to": task.assigned_to if not task.is_manual_update else "Not Applicable : Manually Updated By User",
            "response": task.response,
            "decision": task.decision if not task.is_manual_update else "Not Applicable : Manually Updated By User",
            "notes": task.notes if not task.is_manual_update else "Not Applicable : Manually Updated By User",
            "status": task.status,
            "is_manual_update": task.is_manual_update or False,
            "manual_update_by": task.manual_update_by,
            "manual_update_reason": task.manual_update_reason,
            "created_at": task.created_at,
            "assigned_at": task.assigned_at if not task.is_manual_update else None,
            "completed_at": task.completed_at,
        }
        for task in tasks
    ]


@app.post("/api/applications/{application_id}/human-tasks/{task_id}/complete", tags=["Human Tasks"])
async def complete_human_task(
    application_id: str,
    task_id: int,
    request: HumanDecisionRequest,
    db: Session = Depends(get_db),
):
    """
    Complete a human task with a decision.
    """
    task = db.query(HumanTask).filter_by(
        id=task_id,
        application_id=application_id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "PENDING":
        raise HTTPException(status_code=400, detail="Task is not pending")

    # Update task
    task.decision = request.decision
    task.decided_by = request.decided_by
    task.notes = request.notes
    task.status = "COMPLETED"
    task.completed_at = datetime.utcnow()
    task.response = {"decision": request.decision, "notes": request.notes}

    db.commit()

    # Resume workflow if needed
    try:
        workflow = LoanWorkflow(db=db)
        result = workflow.resume(
            application_id,
            updates={
                "uw_decision": request.decision,
                "uw_decision_by": request.decided_by,
                "uw_decision_notes": request.notes,
            },
        )

        return {
            "success": True,
            "message": "Task completed and workflow resumed",
            "workflow_result": result.get("end_state") if result else None,
        }

    except Exception as e:
        return {
            "success": True,
            "message": f"Task completed but workflow resume failed: {str(e)}",
        }


# Manual status update constant
MANUAL_UPDATE_PLACEHOLDER = "Not Applicable : Manually Updated By User"


@app.post("/api/applications/{application_id}/human-tasks/{task_id}/manual-update", tags=["Human Tasks"])
async def manual_update_task_status(
    application_id: str,
    task_id: int,
    request: ManualStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Manually update task status to move to the next step.
    When manually updated, automated fields are set to null with a placeholder message.
    """
    task = db.query(HumanTask).filter_by(
        id=task_id,
        application_id=application_id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only allow manual update on PENDING or IN_PROGRESS tasks
    if task.status not in ["PENDING", "IN_PROGRESS"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot manually update task with status: {task.status}"
        )

    # Update task with manual update tracking
    task.status = request.new_status.upper()
    task.is_manual_update = True
    task.manual_update_by = request.updated_by
    task.manual_update_reason = request.reason or "Manual status update by user"

    # Set automated fields to null when manually updated
    if request.new_status.upper() == "COMPLETED":
        task.decision = None
        task.notes = MANUAL_UPDATE_PLACEHOLDER
        task.response = {"manual_update": True, "reason": MANUAL_UPDATE_PLACEHOLDER}
        task.completed_at = datetime.utcnow()
        task.assigned_to = None
        task.assigned_at = None

    db.commit()

    # If completing manually, resume workflow with manual update markers
    if request.new_status.upper() == "COMPLETED":
        try:
            workflow = LoanWorkflow(db=db)
            result = workflow.resume(
                application_id,
                updates={
                    "uw_decision": None,
                    "uw_decision_by": MANUAL_UPDATE_PLACEHOLDER,
                    "uw_decision_notes": MANUAL_UPDATE_PLACEHOLDER,
                    "is_manual_update": True,
                },
            )

            return {
                "success": True,
                "message": "Task manually updated and workflow resumed",
                "is_manual_update": True,
                "automated_fields_status": MANUAL_UPDATE_PLACEHOLDER,
                "workflow_result": result.get("end_state") if result else None,
            }

        except Exception as e:
            return {
                "success": True,
                "message": f"Task manually updated but workflow resume failed: {str(e)}",
                "is_manual_update": True,
                "automated_fields_status": MANUAL_UPDATE_PLACEHOLDER,
            }

    return {
        "success": True,
        "message": f"Task manually updated to {request.new_status.upper()}",
        "is_manual_update": True,
        "new_status": request.new_status.upper(),
    }


# ============================================
# Mock API Call Logs
# ============================================

@app.get("/api/applications/{application_id}/api-calls", tags=["API Calls"])
async def get_mock_api_calls(
    application_id: str,
    api_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Get mock API call logs for an application.
    """
    query = db.query(MockAPICall).filter_by(application_id=application_id)

    if api_name:
        query = query.filter(MockAPICall.api_name == api_name)

    calls = query.order_by(MockAPICall.timestamp).all()

    return [
        {
            "id": call.id,
            "application_id": call.application_id,
            "api_name": call.api_name,
            "endpoint": call.endpoint,
            "method": call.method,
            "request_data": call.request_data,
            "response_data": call.response_data,
            "status_code": call.status_code,
            "timestamp": call.timestamp,
            "duration_ms": call.duration_ms,
        }
        for call in calls
    ]


# ============================================
# Workflow Control Endpoints
# ============================================

@app.post("/api/applications/{application_id}/simulate-document-return", tags=["Simulation"])
async def simulate_document_return(
    application_id: str,
    db: Session = Depends(get_db),
):
    """
    Simulate documents being returned by customer.
    """
    app = db.query(LoanApplication).filter_by(application_id=application_id).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Resume workflow with document return
    try:
        workflow = LoanWorkflow(db=db)
        result = workflow.resume(
            application_id,
            updates={"doc_status": "returned"},
        )

        return {
            "success": True,
            "message": "Document return simulated",
            "workflow_status": result.get("workflow_status") if result else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Phase progression order
PHASE_ORDER = [
    "INTAKE",
    "APPLICATION",
    "DISCLOSURE",
    "LOAN_REVIEW",
    "UNDERWRITING",
    "COMMITMENT",
    "CLOSING",
    "POST_CLOSING",
]

# Node mapping per phase
PHASE_NODES = {
    "INTAKE": ["intake_agent"],
    "APPLICATION": ["application_agent"],
    "DISCLOSURE": ["disclosure_agent", "sq_review_disclosure"],
    "LOAN_REVIEW": ["loan_review_agent", "doc_letter_agent", "sq_review_missing_docs"],
    "UNDERWRITING": ["underwriting_agent", "underwriter_review_agent", "human_decision"],
    "COMMITMENT": ["commitment_agent", "sq_review_commitment", "call_agent", "review_agent"],
    "CLOSING": ["closing_packet_agent", "sq_review_closing"],
    "POST_CLOSING": ["review_closing_agent", "sq_review_review_closing", "maintenance_agent", "sq_review_maintenance"],
}

# Automated fields per phase - these get cleared when manually updating
PHASE_AUTOMATED_FIELDS = {
    "INTAKE": ["eligibility_status", "eligibility_reasons", "case_optimizer_result"],
    "APPLICATION": ["app_status", "docusign_envelope_id", "sla_days"],
    "DISCLOSURE": ["disclosure_package"],
    "LOAN_REVIEW": ["docs_needed", "doc_status", "doc_request_count"],
    "UNDERWRITING": ["uw_readiness", "uw_checklist_complete", "uw_assigned_to"],
    "COMMITMENT": ["commitment_letter", "uw_decision", "uw_decision_at"],
    "CLOSING": ["closing_packet", "title_agency_notified"],
    "POST_CLOSING": ["msp_status", "msp_completed_at", "closing_reviewed"],
}


def generate_mock_data_for_phase(phase: str, application_id: str) -> dict:
    """Generate mock data for a completed phase to simulate automated processes."""
    import random

    mock_data = {}

    if phase == "INTAKE":
        mock_data = {
            "eligibility_status": "eligible",
            "eligibility_reasons": ["Loan is assumable", "Property meets requirements", "Borrower qualified"],
            "case_optimizer_result": {"verified": True, "score": random.randint(750, 850)},
        }
    elif phase == "APPLICATION":
        mock_data = {
            "app_status": "complete",
            "docusign_envelope_id": f"ENV-{application_id}-{random.randint(1000, 9999)}",
            "sla_days": random.randint(5, 15),
        }
    elif phase == "DISCLOSURE":
        mock_data = {
            "disclosure_package": {
                "document_ids": [f"DOC-{random.randint(100, 999)}" for _ in range(3)],
                "status": "sent",
                "sent_at": datetime.utcnow().isoformat(),
            },
        }
    elif phase == "LOAN_REVIEW":
        mock_data = {
            "docs_needed": False,
            "doc_status": "complete",
            "doc_request_count": random.randint(0, 2),
        }
    elif phase == "UNDERWRITING":
        mock_data = {
            "uw_readiness": "ready",
            "uw_checklist_complete": True,
            "uw_assigned_to": random.choice(["John Smith", "Jane Doe", "Mike Johnson"]),
        }
    elif phase == "COMMITMENT":
        mock_data = {
            "commitment_letter": {
                "document_id": f"COMMIT-{random.randint(1000, 9999)}",
                "terms": {"interest_rate": round(random.uniform(0.045, 0.075), 4)},
            },
            "uw_decision": "yes",
            "uw_decision_at": datetime.utcnow().isoformat(),
        }
    elif phase == "CLOSING":
        mock_data = {
            "closing_packet": {
                "packet_id": f"CLOSE-{random.randint(1000, 9999)}",
                "title_agency": {"name": "ABC Title Company", "contact": "555-1234"},
                "closing_date": (datetime.utcnow()).isoformat(),
            },
            "title_agency_notified": True,
        }
    elif phase == "POST_CLOSING":
        mock_data = {
            "msp_status": "complete",
            "msp_completed_at": datetime.utcnow().isoformat(),
            "closing_reviewed": True,
        }

    return mock_data


@app.post("/api/applications/{application_id}/manual-phase-update", tags=["Workflow Control"])
async def manual_phase_update(
    application_id: str,
    request: ManualPhaseUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Manually update the application phase/stage to move to the next step.

    When moving to next phase:
    1. Populate mock data for the CURRENT phase (being completed)
    2. Clear data for the TARGET phase and all subsequent phases
    3. Target phase becomes "in-progress" with no data
    """
    app_record = db.query(LoanApplication).filter_by(application_id=application_id).first()

    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    # Validate target phase
    target_phase = request.target_phase.upper()
    if target_phase not in PHASE_ORDER:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid phase: {target_phase}. Valid phases are: {', '.join(PHASE_ORDER)}"
        )

    # Store previous values for logging
    previous_phase = app_record.current_phase
    previous_node = app_record.current_node

    # Determine target node
    target_node = request.target_node
    if not target_node and target_phase in PHASE_NODES:
        target_node = PHASE_NODES[target_phase][0]  # First node in the phase

    # Get phase indices
    previous_phase_index = PHASE_ORDER.index(previous_phase) if previous_phase in PHASE_ORDER else -1
    target_phase_index = PHASE_ORDER.index(target_phase)

    # Update application
    app_record.current_phase = target_phase
    app_record.current_node = target_node
    app_record.updated_at = datetime.utcnow()

    # Get latest workflow state
    latest_state = db.query(WorkflowState).filter_by(
        application_id=application_id
    ).order_by(desc(WorkflowState.created_at)).first()

    state_data = latest_state.state_json.copy() if latest_state and latest_state.state_json else {}

    # Check if this is an in-progress simulation
    is_in_progress_simulation = state_data.get("is_in_progress_simulation", False)

    # STEP 1: Populate mock data for the PREVIOUS phase (being completed)
    # This simulates the automated process that would have run
    if previous_phase and previous_phase in PHASE_ORDER:
        completed_phase_data = generate_mock_data_for_phase(previous_phase, application_id)
        state_data.update(completed_phase_data)

        # Log completion of previous phase
        completion_log = TransactionLog(
            application_id=application_id,
            event_type="PHASE_COMPLETED",
            event_name=f"Phase Completed: {previous_phase}",
            description=f"Phase {previous_phase} manually completed by {request.updated_by}. Data populated.",
            data={
                "phase": previous_phase,
                "completed_by": request.updated_by,
                "populated_data": completed_phase_data,
            },
            source_agent="ManualUpdate",
            source_node=previous_node,
        )
        db.add(completion_log)

    # STEP 2: Clear data for TARGET phase and all subsequent phases
    # The target phase is now "in-progress" with no data
    fields_to_clear = []
    for idx, phase in enumerate(PHASE_ORDER):
        if idx >= target_phase_index:
            phase_fields = PHASE_AUTOMATED_FIELDS.get(phase, [])
            fields_to_clear.extend(phase_fields)
            for field in phase_fields:
                state_data[field] = None

    # Update phase info
    state_data["current_phase"] = target_phase
    state_data["current_node"] = target_node
    state_data["previous_node"] = previous_node
    state_data["manual_update_by"] = request.updated_by
    state_data["manual_update_reason"] = request.reason or "Manual status update by user"
    state_data["manual_update_at"] = datetime.utcnow().isoformat()
    state_data["manually_cleared_fields"] = fields_to_clear

    # Determine if we've reached the final phase
    is_final_phase = target_phase == "POST_CLOSING"

    if is_final_phase:
        # Populate data for POST_CLOSING (final phase being completed)
        final_phase_data = generate_mock_data_for_phase("POST_CLOSING", application_id)
        state_data.update(final_phase_data)

        # Complete the workflow
        state_data["workflow_status"] = "completed"
        state_data["end_state"] = "loan_closed"
        state_data["is_in_progress_simulation"] = False
        state_data["is_manual_update"] = False  # Clear manual update flag on completion
        app_record.status = "COMPLETED"
        app_record.end_state = "loan_closed"
        app_record.completed_at = datetime.utcnow()
    else:
        # Keep as paused for step-by-step progression
        # Target phase is now "in-progress" with NO DATA
        state_data["workflow_status"] = "paused"
        state_data["is_in_progress_simulation"] = is_in_progress_simulation
        state_data["is_manual_update"] = True
        state_data["in_progress_task"] = f"{target_phase} - Awaiting Completion"

    # Log the phase transition
    manual_log = TransactionLog(
        application_id=application_id,
        event_type="MANUAL_UPDATE",
        event_name=f"Phase Transition: {previous_phase} → {target_phase}",
        description=f"Moved to {target_phase} by {request.updated_by}. Target phase has no data until completed.",
        data={
            "previous_phase": previous_phase,
            "previous_node": previous_node,
            "new_phase": target_phase,
            "new_node": target_node,
            "updated_by": request.updated_by,
            "reason": request.reason,
            "is_in_progress_simulation": is_in_progress_simulation,
            "fields_cleared": fields_to_clear,
        },
        source_agent="ManualUpdate",
        source_node=target_node,
    )
    db.add(manual_log)

    # Create new state snapshot
    new_state = WorkflowState(
        application_id=application_id,
        state_json=state_data,
        checkpoint_name=f"manual_update_{target_phase.lower()}",
        phase=target_phase,
    )
    db.add(new_state)

    db.commit()

    # Calculate next phase info for response
    next_phase = None
    next_node = None
    if not is_final_phase:
        next_phase_idx = PHASE_ORDER.index(target_phase) + 1
        if next_phase_idx < len(PHASE_ORDER):
            next_phase = PHASE_ORDER[next_phase_idx]
            next_node = PHASE_NODES.get(next_phase, [None])[0]

    return {
        "success": True,
        "message": f"Completed {previous_phase}, now at {target_phase}" if not is_final_phase else f"Workflow completed at {target_phase}",
        "is_in_progress_simulation": is_in_progress_simulation and not is_final_phase,
        "previous_phase": previous_phase,
        "previous_phase_data_populated": True,
        "new_phase": target_phase,
        "new_phase_has_data": is_final_phase,  # Only final phase has data immediately
        "new_node": target_node,
        "updated_by": request.updated_by,
        "fields_cleared": fields_to_clear,
        "is_final_phase": is_final_phase,
        "next_phase": next_phase,
        "next_node": next_node,
        "workflow_completed": is_final_phase,
    }


@app.post("/api/applications/{application_id}/complete-current-task", tags=["Workflow Control"])
async def complete_current_task(
    application_id: str,
    db: Session = Depends(get_db),
    updated_by: str = "UI User",
):
    """
    Complete the current in-progress task.

    This will:
    1. Populate mock data for the current phase (simulating automated process)
    2. Move to the next phase which becomes "in-progress" with NO data
    3. If at final phase, complete the workflow
    """
    app_record = db.query(LoanApplication).filter_by(application_id=application_id).first()

    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    current_phase = app_record.current_phase

    if current_phase not in PHASE_ORDER:
        raise HTTPException(status_code=400, detail=f"Invalid current phase: {current_phase}")

    current_phase_index = PHASE_ORDER.index(current_phase)

    # Get latest workflow state
    latest_state = db.query(WorkflowState).filter_by(
        application_id=application_id
    ).order_by(desc(WorkflowState.created_at)).first()

    state_data = latest_state.state_json.copy() if latest_state and latest_state.state_json else {}

    # Check if this is an in-progress simulation
    is_in_progress_simulation = state_data.get("is_in_progress_simulation", False)

    # Populate mock data for the CURRENT phase (completing it)
    completed_phase_data = generate_mock_data_for_phase(current_phase, application_id)
    state_data.update(completed_phase_data)

    # Log completion of current phase
    completion_log = TransactionLog(
        application_id=application_id,
        event_type="TASK_COMPLETED",
        event_name=f"Task Completed: {current_phase}",
        description=f"Task in {current_phase} completed by {updated_by}. Data populated.",
        data={
            "phase": current_phase,
            "completed_by": updated_by,
            "populated_data": completed_phase_data,
        },
        source_agent="ManualUpdate",
        source_node=app_record.current_node,
    )
    db.add(completion_log)

    # Check if this is the final phase
    is_final_phase = current_phase_index >= len(PHASE_ORDER) - 1

    if is_final_phase:
        # Workflow completed
        state_data["workflow_status"] = "completed"
        state_data["end_state"] = "loan_closed"
        state_data["current_node"] = "end_loan_closed"
        state_data["is_in_progress_simulation"] = False
        state_data["is_manual_update"] = False
        app_record.status = "COMPLETED"
        app_record.end_state = "loan_closed"
        app_record.current_node = "end_loan_closed"  # Set to end node for proper detection
        app_record.completed_at = datetime.utcnow()

        next_phase = None
        next_node = "end_loan_closed"
    else:
        # Move to next phase
        next_phase = PHASE_ORDER[current_phase_index + 1]
        next_node = PHASE_NODES.get(next_phase, [None])[0]

        # Update application to next phase
        app_record.current_phase = next_phase
        app_record.current_node = next_node
        app_record.updated_at = datetime.utcnow()

        # Clear data for next phase and all subsequent phases
        for idx in range(current_phase_index + 1, len(PHASE_ORDER)):
            phase = PHASE_ORDER[idx]
            phase_fields = PHASE_AUTOMATED_FIELDS.get(phase, [])
            for field in phase_fields:
                state_data[field] = None

        # Update state for next phase (in-progress with no data)
        state_data["current_phase"] = next_phase
        state_data["current_node"] = next_node
        state_data["workflow_status"] = "paused"
        state_data["is_in_progress_simulation"] = is_in_progress_simulation
        state_data["is_manual_update"] = True
        state_data["in_progress_task"] = f"{next_phase} - Awaiting Completion"
        state_data["manual_update_by"] = updated_by
        state_data["manual_update_at"] = datetime.utcnow().isoformat()

    # Create new state snapshot
    new_state = WorkflowState(
        application_id=application_id,
        state_json=state_data,
        checkpoint_name=f"task_completed_{current_phase.lower()}",
        phase=next_phase if not is_final_phase else current_phase,
    )
    db.add(new_state)

    db.commit()

    # Calculate next phase info for response
    response_next_phase = None
    response_next_node = None
    if not is_final_phase and next_phase:
        next_idx = PHASE_ORDER.index(next_phase)
        if next_idx < len(PHASE_ORDER) - 1:
            response_next_phase = PHASE_ORDER[next_idx + 1]
            response_next_node = PHASE_NODES.get(response_next_phase, [None])[0]

    return {
        "success": True,
        "message": f"Completed task in {current_phase}" + (f", moved to {next_phase}" if next_phase else ", workflow completed!"),
        "completed_phase": current_phase,
        "completed_phase_data": completed_phase_data,
        "new_phase": next_phase,
        "new_node": next_node,
        "new_phase_has_data": False,  # Next phase has no data until completed
        "is_final_phase": is_final_phase,
        "workflow_completed": is_final_phase,
        "next_phase": response_next_phase,
        "next_node": response_next_node,
    }


@app.get("/api/applications/{application_id}/available-phases", tags=["Workflow Control"])
async def get_available_phases(
    application_id: str,
    db: Session = Depends(get_db),
):
    """
    Get available phases and nodes for manual phase update.
    """
    app_record = db.query(LoanApplication).filter_by(application_id=application_id).first()

    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    current_phase = app_record.current_phase
    current_phase_index = PHASE_ORDER.index(current_phase) if current_phase in PHASE_ORDER else -1

    # Get latest state to check for data
    latest_state = db.query(WorkflowState).filter_by(
        application_id=application_id
    ).order_by(desc(WorkflowState.created_at)).first()

    state_data = latest_state.state_json if latest_state else {}

    def phase_has_data(phase):
        """Check if a phase has any populated data."""
        fields = PHASE_AUTOMATED_FIELDS.get(phase, [])
        return any(state_data.get(field) is not None for field in fields)

    return {
        "application_id": application_id,
        "current_phase": current_phase,
        "current_node": app_record.current_node,
        "is_in_progress_simulation": state_data.get("is_in_progress_simulation", False),
        "phases": [
            {
                "phase": phase,
                "nodes": PHASE_NODES.get(phase, []),
                "is_current": phase == current_phase,
                "is_next": PHASE_ORDER.index(phase) == current_phase_index + 1 if current_phase_index >= 0 else False,
                "is_completed": PHASE_ORDER.index(phase) < current_phase_index,
                "has_data": phase_has_data(phase),
                "can_move_to": True,
            }
            for phase in PHASE_ORDER
        ],
    }


# ============================================
# Data Management
# ============================================

@app.post("/api/data/flush-all", tags=["Data Management"])
async def flush_all_applications(
    db: Session = Depends(get_db),
):
    """
    Delete all loan applications and related data.
    WARNING: This permanently deletes all data.
    """
    from sqlalchemy import text

    try:
        # Use raw SQL to avoid ORM model column mismatches
        # Get counts first
        count_apps = db.execute(text("SELECT COUNT(*) FROM loan_applications")).scalar() or 0
        count_states = db.execute(text("SELECT COUNT(*) FROM workflow_states")).scalar() or 0
        count_executions = db.execute(text("SELECT COUNT(*) FROM agent_executions")).scalar() or 0
        count_transactions = db.execute(text("SELECT COUNT(*) FROM transaction_logs")).scalar() or 0
        count_tasks = db.execute(text("SELECT COUNT(*) FROM human_tasks")).scalar() or 0
        count_api_calls = db.execute(text("SELECT COUNT(*) FROM mock_api_calls")).scalar() or 0

        # Delete in order due to foreign key constraints (children first)
        db.execute(text("DELETE FROM mock_api_calls"))
        db.execute(text("DELETE FROM human_tasks"))
        db.execute(text("DELETE FROM transaction_logs"))
        db.execute(text("DELETE FROM agent_executions"))
        db.execute(text("DELETE FROM workflow_states"))
        db.execute(text("DELETE FROM loan_applications"))

        db.commit()

        return {
            "success": True,
            "message": "All application data has been deleted",
            "deleted": {
                "applications": count_apps,
                "workflow_states": count_states,
                "agent_executions": count_executions,
                "transaction_logs": count_transactions,
                "human_tasks": count_tasks,
                "api_calls": count_api_calls,
            }
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"Flush error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Failed to flush data: {str(e)}")


# ============================================
# Health Check
# ============================================

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ============================================
# Run the application
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
