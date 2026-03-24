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
    Specialist,
    SpecialistTask,
    SubtaskNote,
    AllocationHistory,
    WorkflowTaskDefinition,
    SubTaskDefinition,
    ChecklistItemDefinition,
    SPECIALTY_TYPES,
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
    # Specialist system models
    SpecialistLoginRequest,
    SpecialistLoginResponse,
    CreateSpecialistRequest,
    UpdateSpecialistRequest,
    SpecialistResponse,
    SpecialistTaskResponse,
    CompleteTaskRequest,
    ReassignTaskRequest,
    WorkloadOverviewResponse,
    AddSubtaskNoteRequest,
    SubtaskNoteResponse,
    AllocationEventRequest,
    AllocationEventResponse,
    CreateSubtaskRequest,
    UpdateSubtaskRequest,
    CreateChecklistItemRequest,
    UpdateChecklistItemRequest,
    UpdateTaskSLARequest,
    CreateWorkflowTaskRequest,
    UpdateWorkflowTaskRequest,
)
from services.auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_specialist,
    get_optional_specialist,
    require_admin,
    authenticate_specialist,
)
from services.task_assignment import TaskAssignmentService
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

    # Check if this is a specialist-controlled simulation (loan_closed)
    # For loan_closed, we pause at INTAKE and let specialists drive the workflow
    if request.simulation_type == "loan_closed":
        try:
            # Create application record at INTAKE phase
            app_record = LoanApplication(
                application_id=application_id,
                customer_name=request.customer_name,
                customer_email=request.customer_email,
                customer_phone=request.customer_phone,
                property_address=request.property_address,
                loan_amount=request.loan_amount,
                original_borrower=request.original_borrower,
                status="IN_PROGRESS",
                current_phase="INTAKE",
                current_node="intake",
            )
            db.add(app_record)

            # Create initial workflow state
            workflow_state = WorkflowState(
                application_id=application_id,
                state_json=initial_state,
                checkpoint_name="specialist_controlled_start",
                phase="INTAKE",
            )
            db.add(workflow_state)

            # Log the start
            log_entry = TransactionLog(
                application_id=application_id,
                event_type="WORKFLOW_START",
                event_name="Specialist-Controlled Workflow Started",
                description=f"Application created for {request.customer_name}. Awaiting specialist completion.",
                data={"simulation_type": "loan_closed", "mode": "specialist_controlled"},
                source_agent="Supervisor",
                source_node="intake",
            )
            db.add(log_entry)

            db.commit()

            # Create specialist tasks - this will auto-assign INTAKE to an intake specialist
            task_service = TaskAssignmentService(db)
            task_service.create_tasks_for_application(application_id)

            return LoanApplicationResponse(
                application_id=application_id,
                status="IN_PROGRESS",
                current_phase="INTAKE",
                current_node="intake",
                created_at=app_record.created_at,
                updated_at=app_record.updated_at,
                message="Application created. INTAKE task assigned to specialist. Workflow will advance as specialists complete their tasks.",
            )

        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    # For other simulation types (denied, in_progress, or default), run the full workflow
    try:
        workflow = LoanWorkflow(db=db)
        result = workflow.start(initial_state)

        # Get the created application
        app_record = db.query(LoanApplication).filter_by(
            application_id=application_id
        ).first()

        if not app_record:
            raise HTTPException(status_code=500, detail="Failed to create application")

        # Create specialist tasks for this application
        task_service = TaskAssignmentService(db)
        task_service.create_tasks_for_application(application_id)

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
    "HUMAN_DECISION",  # Underwriter decision step
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
    "UNDERWRITING": ["underwriting_agent", "underwriter_review_agent"],
    "HUMAN_DECISION": ["human_decision_node"],  # Underwriter decision step
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
    "HUMAN_DECISION": ["uw_decision", "uw_decision_by", "uw_decision_at", "uw_decision_notes"],  # Underwriter decision fields
    "COMMITMENT": ["commitment_letter"],
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

    # Update specialist tasks - mark current phase as completed
    # Note: HUMAN_DECISION doesn't have its own task - it's handled by UNDERWRITING specialist
    task_phase_to_complete = current_phase
    if current_phase == "HUMAN_DECISION":
        task_phase_to_complete = "UNDERWRITING"  # Already completed when we entered HUMAN_DECISION

    current_task = db.query(SpecialistTask).filter(
        SpecialistTask.application_id == application_id,
        SpecialistTask.phase == task_phase_to_complete,
    ).first()

    if current_task and current_task.status != "COMPLETED":
        current_task.status = "COMPLETED"
        current_task.completed_at = datetime.utcnow()
        current_task.completion_notes = f"Auto-completed via complete-current-task by {updated_by}"

    # If not final phase, activate next phase task
    # Note: HUMAN_DECISION doesn't have a specialist task, so skip activation for it
    if not is_final_phase and next_phase:
        task_phase_to_activate = next_phase
        if next_phase == "HUMAN_DECISION":
            # HUMAN_DECISION is handled by UNDERWRITING specialist, skip activation
            # The next real task to activate will be COMMITMENT after HUMAN_DECISION
            pass
        else:
            next_task = db.query(SpecialistTask).filter(
                SpecialistTask.application_id == application_id,
                SpecialistTask.phase == task_phase_to_activate,
            ).first()

            if next_task and next_task.status == "PENDING":
                next_task.status = "READY"
                # Auto-assign using TaskAssignmentService
                from services.task_assignment import TaskAssignmentService
                task_service = TaskAssignmentService(db)
                task_service.auto_assign_task(next_task)

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
    Also clears allocation history and resets specialist allocations.
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

        # Check if specialist_tasks table exists and get count
        count_specialist_tasks = 0
        try:
            count_specialist_tasks = db.execute(text("SELECT COUNT(*) FROM specialist_tasks")).scalar() or 0
        except:
            pass  # Table may not exist yet

        # Get allocation history count
        count_allocation_history = 0
        try:
            count_allocation_history = db.execute(text("SELECT COUNT(*) FROM allocation_history")).scalar() or 0
        except:
            pass

        # Delete in order due to foreign key constraints (children first)
        db.execute(text("DELETE FROM mock_api_calls"))
        db.execute(text("DELETE FROM human_tasks"))
        db.execute(text("DELETE FROM transaction_logs"))
        db.execute(text("DELETE FROM agent_executions"))
        db.execute(text("DELETE FROM workflow_states"))

        # Delete specialist tasks if table exists
        try:
            db.execute(text("DELETE FROM specialist_tasks"))
        except:
            pass

        # Delete allocation history
        try:
            db.execute(text("DELETE FROM allocation_history"))
        except:
            pass

        # Reset specialist allocations (set to empty/unallocated)
        try:
            db.execute(text("""
                UPDATE specialists
                SET specialty_types = '[]',
                    dual_phase = 0,
                    dual_phases = '[]'
                WHERE role = 'specialist'
            """))
        except:
            pass

        db.execute(text("DELETE FROM loan_applications"))

        db.commit()

        return {
            "success": True,
            "message": "All application data has been deleted, allocation history cleared, and specialist allocations reset",
            "deleted": {
                "applications": count_apps,
                "workflow_states": count_states,
                "agent_executions": count_executions,
                "transaction_logs": count_transactions,
                "human_tasks": count_tasks,
                "api_calls": count_api_calls,
                "specialist_tasks": count_specialist_tasks,
                "allocation_history": count_allocation_history,
                "specialist_allocations_reset": True,
            }
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"Flush error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Failed to flush data: {str(e)}")


@app.post("/api/data/sync-specialist-tasks", tags=["Data Management"])
async def sync_specialist_tasks(
    db: Session = Depends(get_db),
):
    """
    Synchronize specialist tasks with current application phases.
    This fixes any out-of-sync tasks by marking completed phases as COMPLETED
    and activating the current phase task.
    """
    from services.task_assignment import TaskAssignmentService
    task_service = TaskAssignmentService(db)

    # Get all applications that are not completed
    apps = db.query(LoanApplication).filter(
        LoanApplication.status != "COMPLETED"
    ).all()

    synced_apps = []

    for app in apps:
        current_phase = app.current_phase
        if current_phase not in PHASE_ORDER:
            continue

        current_phase_idx = PHASE_ORDER.index(current_phase)

        # Get all specialist tasks for this application
        tasks = db.query(SpecialistTask).filter(
            SpecialistTask.application_id == app.application_id
        ).all()

        if not tasks:
            continue

        task_by_phase = {t.phase: t for t in tasks}
        changes = []

        # Mark all phases before current as COMPLETED
        for idx, phase in enumerate(PHASE_ORDER):
            # Skip HUMAN_DECISION as it doesn't have a specialist task
            if phase == "HUMAN_DECISION":
                continue

            task = task_by_phase.get(phase)
            if not task:
                continue

            if phase == current_phase:
                # Current phase should be READY or ASSIGNED
                if task.status in ["PENDING"]:
                    task.status = "READY"
                    task_service.auto_assign_task(task)
                    changes.append(f"{phase}: PENDING -> READY/ASSIGNED")
            elif idx < current_phase_idx:
                # Previous phases should be COMPLETED
                if task.status != "COMPLETED":
                    old_status = task.status
                    task.status = "COMPLETED"
                    task.completed_at = datetime.utcnow()
                    task.completion_notes = "Auto-completed via sync"
                    changes.append(f"{phase}: {old_status} -> COMPLETED")
            # Future phases remain PENDING

        if changes:
            synced_apps.append({
                "application_id": app.application_id,
                "current_phase": current_phase,
                "changes": changes
            })

    db.commit()

    return {
        "success": True,
        "message": f"Synced {len(synced_apps)} applications",
        "synced_applications": synced_apps
    }


@app.post("/api/applications/{application_id}/sync-tasks", tags=["Data Management"])
async def sync_application_tasks(
    application_id: str,
    db: Session = Depends(get_db),
):
    """
    Synchronize specialist tasks for a specific application.
    """
    from services.task_assignment import TaskAssignmentService
    task_service = TaskAssignmentService(db)

    app = db.query(LoanApplication).filter_by(application_id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    current_phase = app.current_phase
    if current_phase not in PHASE_ORDER:
        raise HTTPException(status_code=400, detail=f"Invalid phase: {current_phase}")

    current_phase_idx = PHASE_ORDER.index(current_phase)

    # Get all specialist tasks for this application
    tasks = db.query(SpecialistTask).filter(
        SpecialistTask.application_id == application_id
    ).all()

    if not tasks:
        raise HTTPException(status_code=404, detail="No specialist tasks found for this application")

    task_by_phase = {t.phase: t for t in tasks}
    changes = []

    # Mark all phases before current as COMPLETED
    for idx, phase in enumerate(PHASE_ORDER):
        # Skip HUMAN_DECISION as it doesn't have a specialist task
        if phase == "HUMAN_DECISION":
            continue

        task = task_by_phase.get(phase)
        if not task:
            continue

        if phase == current_phase:
            # Current phase should be READY or ASSIGNED
            if task.status in ["PENDING"]:
                task.status = "READY"
                task_service.auto_assign_task(task)
                changes.append(f"{phase}: PENDING -> READY/ASSIGNED")
        elif idx < current_phase_idx:
            # Previous phases should be COMPLETED
            if task.status != "COMPLETED":
                old_status = task.status
                task.status = "COMPLETED"
                task.completed_at = datetime.utcnow()
                task.completion_notes = "Auto-completed via sync"
                changes.append(f"{phase}: {old_status} -> COMPLETED")
        # Future phases remain PENDING

    db.commit()

    return {
        "success": True,
        "application_id": application_id,
        "current_phase": current_phase,
        "changes": changes if changes else ["No changes needed - tasks already in sync"]
    }


# ============================================
# Authentication Endpoints
# ============================================

@app.post("/api/auth/login", response_model=SpecialistLoginResponse, tags=["Authentication"])
async def specialist_login(
    request: SpecialistLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate specialist and return session token."""
    specialist = authenticate_specialist(db, request.username, request.password)

    if not specialist:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    token = create_token(specialist.id, specialist.username, specialist.role)

    return SpecialistLoginResponse(
        specialist_id=specialist.id,
        username=specialist.username,
        full_name=specialist.full_name,
        specialty_type=specialist.specialty_type,
        role=specialist.role,
        token=token,
    )


@app.post("/api/auth/logout", tags=["Authentication"])
async def specialist_logout():
    """Logout specialist (client should discard token)."""
    return {"success": True, "message": "Logged out successfully"}


@app.get("/api/auth/me", response_model=SpecialistResponse, tags=["Authentication"])
async def get_current_user(
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Get current logged-in specialist info."""
    # Get task counts
    pending = db.query(SpecialistTask).filter(
        SpecialistTask.specialist_id == specialist.id,
        SpecialistTask.status == "ASSIGNED",
    ).count()

    in_progress = db.query(SpecialistTask).filter(
        SpecialistTask.specialist_id == specialist.id,
        SpecialistTask.status == "IN_PROGRESS",
    ).count()

    return SpecialistResponse(
        id=specialist.id,
        username=specialist.username,
        full_name=specialist.full_name,
        email=specialist.email,
        specialty_type=specialist.specialty_type,
        role=specialist.role,
        is_active=specialist.is_active,
        created_at=specialist.created_at,
        last_login_at=specialist.last_login_at,
        pending_tasks_count=pending,
        in_progress_tasks_count=in_progress,
    )


# ============================================
# Specialist Management (Admin)
# ============================================

@app.get("/api/admin/specialists", response_model=List[SpecialistResponse], tags=["Admin"])
async def list_specialists(
    specialty_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all specialists with optional filter by specialty."""
    query = db.query(Specialist)

    if specialty_type:
        # Filter by specialty_type (legacy) or specialty_types (new)
        query = query.filter(Specialist.specialty_type == specialty_type)

    specialists = query.order_by(Specialist.full_name).all()

    result = []
    for spec in specialists:
        pending = db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == spec.id,
            SpecialistTask.status == "ASSIGNED",
        ).count()

        in_progress = db.query(SpecialistTask).filter(
            SpecialistTask.specialist_id == spec.id,
            SpecialistTask.status == "IN_PROGRESS",
        ).count()

        # Get specialty_types, fallback to legacy specialty_type if empty
        specialty_types = spec.specialty_types or []
        if not specialty_types and spec.specialty_type and spec.specialty_type != "NOT_ALLOCATED":
            specialty_types = [spec.specialty_type]

        result.append(SpecialistResponse(
            id=spec.id,
            username=spec.username,
            full_name=spec.full_name,
            email=spec.email,
            specialty_type=spec.specialty_type or "NOT_ALLOCATED",
            specialty_types=specialty_types,
            dual_phase=spec.dual_phase or False,
            dual_phases=spec.dual_phases or [],
            role=spec.role,
            is_active=spec.is_active,
            created_at=spec.created_at,
            last_login_at=spec.last_login_at,
            pending_tasks_count=pending,
            in_progress_tasks_count=in_progress,
        ))

    return result


@app.post("/api/admin/specialists", response_model=SpecialistResponse, tags=["Admin"])
async def create_specialist(
    request: CreateSpecialistRequest,
    db: Session = Depends(get_db),
):
    """Create a new specialist."""
    # Check if username already exists
    existing = db.query(Specialist).filter(Specialist.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Handle specialty_types - use new field if provided, fallback to legacy field
    specialty_types = request.specialty_types if request.specialty_types else []
    if not specialty_types and request.specialty_type:
        specialty_types = [request.specialty_type]

    # Primary specialty_type for backward compatibility
    primary_specialty = specialty_types[0] if specialty_types else "NOT_ALLOCATED"

    specialist = Specialist(
        username=request.username,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        email=request.email,
        specialty_type=primary_specialty,
        specialty_types=specialty_types,
        role=request.role,
    )
    db.add(specialist)
    db.commit()
    db.refresh(specialist)

    return SpecialistResponse(
        id=specialist.id,
        username=specialist.username,
        full_name=specialist.full_name,
        email=specialist.email,
        specialty_type=specialist.specialty_type or "NOT_ALLOCATED",
        specialty_types=specialist.specialty_types or [],
        role=specialist.role,
        is_active=specialist.is_active,
        created_at=specialist.created_at,
        last_login_at=specialist.last_login_at,
        pending_tasks_count=0,
        in_progress_tasks_count=0,
    )


@app.put("/api/admin/specialists/{specialist_id}", response_model=SpecialistResponse, tags=["Admin"])
async def update_specialist(
    specialist_id: int,
    request: UpdateSpecialistRequest,
    db: Session = Depends(get_db),
):
    """Update specialist details."""
    specialist = db.query(Specialist).filter(Specialist.id == specialist_id).first()

    if not specialist:
        raise HTTPException(status_code=404, detail="Specialist not found")

    if request.full_name is not None:
        specialist.full_name = request.full_name
    if request.email is not None:
        specialist.email = request.email

    # Handle specialty_types (new multi-select field)
    if request.specialty_types is not None:
        specialist.specialty_types = request.specialty_types
        # Update legacy field for backward compatibility
        if request.specialty_types:
            specialist.specialty_type = request.specialty_types[0]
        else:
            specialist.specialty_type = "NOT_ALLOCATED"
    # Legacy single specialty_type field (for backward compatibility)
    elif request.specialty_type is not None:
        # Empty string means unallocated - store as "NOT_ALLOCATED"
        new_type = request.specialty_type if request.specialty_type else "NOT_ALLOCATED"
        specialist.specialty_type = new_type
        # Also update specialty_types list
        if new_type == "NOT_ALLOCATED":
            specialist.specialty_types = []
        else:
            specialist.specialty_types = [new_type]

    if request.is_active is not None:
        specialist.is_active = request.is_active
    if request.role is not None:
        specialist.role = request.role
    if request.password is not None:
        specialist.password_hash = hash_password(request.password)

    # Handle dual-phase assignment
    if request.dual_phase is not None:
        specialist.dual_phase = request.dual_phase
    if request.dual_phases is not None:
        specialist.dual_phases = request.dual_phases

    db.commit()
    db.refresh(specialist)

    pending = db.query(SpecialistTask).filter(
        SpecialistTask.specialist_id == specialist.id,
        SpecialistTask.status == "ASSIGNED",
    ).count()

    in_progress = db.query(SpecialistTask).filter(
        SpecialistTask.specialist_id == specialist.id,
        SpecialistTask.status == "IN_PROGRESS",
    ).count()

    return SpecialistResponse(
        id=specialist.id,
        username=specialist.username,
        full_name=specialist.full_name,
        email=specialist.email,
        specialty_type=specialist.specialty_type or "NOT_ALLOCATED",
        specialty_types=specialist.specialty_types or [],
        dual_phase=specialist.dual_phase or False,
        dual_phases=specialist.dual_phases or [],
        role=specialist.role,
        is_active=specialist.is_active,
        created_at=specialist.created_at,
        last_login_at=specialist.last_login_at,
        pending_tasks_count=pending,
        in_progress_tasks_count=in_progress,
    )


@app.delete("/api/admin/specialists/{specialist_id}", tags=["Admin"])
async def delete_specialist(
    specialist_id: int,
    db: Session = Depends(get_db),
):
    """Deactivate a specialist (soft delete)."""
    specialist = db.query(Specialist).filter(Specialist.id == specialist_id).first()

    if not specialist:
        raise HTTPException(status_code=404, detail="Specialist not found")

    specialist.is_active = False
    db.commit()

    return {"success": True, "message": f"Specialist {specialist.username} deactivated"}


@app.get("/api/admin/workload-overview", response_model=WorkloadOverviewResponse, tags=["Admin"])
async def get_workload_overview(
    db: Session = Depends(get_db),
):
    """Get workload overview across all specialists and specialties."""
    service = TaskAssignmentService(db)
    return service.get_workload_overview()


@app.get("/api/admin/specialty-types", tags=["Admin"])
async def get_specialty_types():
    """Get list of available specialty types."""
    return {"specialty_types": SPECIALTY_TYPES}


@app.get("/api/admin/specialist-task-stats", tags=["Admin"])
async def get_specialist_task_stats(
    db: Session = Depends(get_db),
):
    """Get task completion statistics for each specialist."""
    from sqlalchemy import func

    # Query to get task counts by specialist and status
    stats = db.query(
        Specialist.id,
        Specialist.full_name,
        Specialist.username,
        Specialist.specialty_type,
        func.count(SpecialistTask.id).filter(SpecialistTask.status == 'COMPLETED').label('completed_count'),
        func.count(SpecialistTask.id).filter(SpecialistTask.status == 'IN_PROGRESS').label('in_progress_count'),
        func.count(SpecialistTask.id).filter(SpecialistTask.status == 'ASSIGNED').label('assigned_count'),
        func.count(SpecialistTask.id).label('total_tasks'),
    ).outerjoin(
        SpecialistTask, Specialist.id == SpecialistTask.specialist_id
    ).filter(
        Specialist.role != 'admin',
        Specialist.is_active == True
    ).group_by(
        Specialist.id
    ).all()

    result = []
    for stat in stats:
        result.append({
            "specialist_id": stat.id,
            "full_name": stat.full_name,
            "username": stat.username,
            "specialty_type": stat.specialty_type,
            "completed_count": stat.completed_count or 0,
            "in_progress_count": stat.in_progress_count or 0,
            "assigned_count": stat.assigned_count or 0,
            "total_tasks": stat.total_tasks or 0,
        })

    # Sort by completed count descending
    result.sort(key=lambda x: x['completed_count'], reverse=True)

    return result


# ============================================
# Allocation History
# ============================================

@app.post("/api/admin/allocation-history", response_model=AllocationEventResponse, tags=["Admin"])
async def create_allocation_event(
    request: AllocationEventRequest,
    db: Session = Depends(get_db),
):
    """Create a new allocation history event."""
    event = AllocationHistory(
        event_type=request.event_type,
        specialist_id=request.specialist_id,
        specialist_name=request.specialist_name,
        from_phase=request.from_phase,
        to_phase=request.to_phase,
        task_id=request.task_id,
        application_id=request.application_id,
        from_specialist_id=request.from_specialist_id,
        from_specialist_name=request.from_specialist_name,
        to_specialist_id=request.to_specialist_id,
        to_specialist_name=request.to_specialist_name,
        reason=request.reason,
        reason_details=request.reason_details,
        performed_by_id=request.performed_by_id,
        performed_by_name=request.performed_by_name,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return AllocationEventResponse(
        id=event.id,
        event_type=event.event_type,
        specialist_id=event.specialist_id,
        specialist_name=event.specialist_name,
        from_phase=event.from_phase,
        to_phase=event.to_phase,
        task_id=event.task_id,
        application_id=event.application_id,
        from_specialist_id=event.from_specialist_id,
        from_specialist_name=event.from_specialist_name,
        to_specialist_id=event.to_specialist_id,
        to_specialist_name=event.to_specialist_name,
        reason=event.reason,
        reason_details=event.reason_details,
        performed_by_id=event.performed_by_id,
        performed_by_name=event.performed_by_name,
        created_at=event.created_at,
    )


@app.get("/api/admin/allocation-history", response_model=List[AllocationEventResponse], tags=["Admin"])
async def get_allocation_history(
    specialist_id: Optional[int] = None,
    event_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    """Get allocation history with optional filters."""
    query = db.query(AllocationHistory)

    if specialist_id:
        query = query.filter(AllocationHistory.specialist_id == specialist_id)
    if event_type:
        query = query.filter(AllocationHistory.event_type == event_type)

    events = query.order_by(desc(AllocationHistory.created_at)).limit(limit).all()

    return [
        AllocationEventResponse(
            id=e.id,
            event_type=e.event_type,
            specialist_id=e.specialist_id,
            specialist_name=e.specialist_name,
            from_phase=e.from_phase,
            to_phase=e.to_phase,
            task_id=e.task_id,
            application_id=e.application_id,
            from_specialist_id=e.from_specialist_id,
            from_specialist_name=e.from_specialist_name,
            to_specialist_id=e.to_specialist_id,
            to_specialist_name=e.to_specialist_name,
            reason=e.reason,
            reason_details=e.reason_details,
            performed_by_id=e.performed_by_id,
            performed_by_name=e.performed_by_name,
            created_at=e.created_at,
        )
        for e in events
    ]


# ============================================
# Task Management
# ============================================

@app.get("/api/tasks", response_model=List[SpecialistTaskResponse], tags=["Tasks"])
async def list_tasks(
    status: Optional[str] = None,
    phase: Optional[str] = None,
    specialist_id: Optional[int] = None,
    application_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all tasks with filters."""
    query = db.query(SpecialistTask)

    if status:
        query = query.filter(SpecialistTask.status == status.upper())
    if phase:
        query = query.filter(SpecialistTask.phase == phase.upper())
    if specialist_id:
        query = query.filter(SpecialistTask.specialist_id == specialist_id)
    if application_id:
        query = query.filter(SpecialistTask.application_id == application_id)

    tasks = query.order_by(desc(SpecialistTask.created_at)).limit(100).all()

    result = []
    for task in tasks:
        # Get specialist name
        specialist_name = None
        if task.specialist_id:
            specialist = db.query(Specialist).filter(Specialist.id == task.specialist_id).first()
            if specialist:
                specialist_name = specialist.full_name

        # Get application info
        app_record = db.query(LoanApplication).filter(
            LoanApplication.application_id == task.application_id
        ).first()

        result.append(SpecialistTaskResponse(
            id=task.id,
            application_id=task.application_id,
            specialist_id=task.specialist_id,
            specialist_name=specialist_name,
            phase=task.phase,
            task_title=task.task_title,
            task_description=task.task_description,
            priority=task.priority,
            status=task.status,
            created_at=task.created_at,
            assigned_at=task.assigned_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
            due_date=task.due_date,
            customer_name=app_record.customer_name if app_record else None,
            loan_amount=app_record.loan_amount if app_record else None,
            current_workflow_phase=app_record.current_phase if app_record else None,
        ))

    return result


@app.post("/api/tasks/{task_id}/assign", response_model=SpecialistTaskResponse, tags=["Tasks"])
async def assign_task(
    task_id: int,
    request: ReassignTaskRequest,
    db: Session = Depends(get_db),
):
    """Manually assign/reassign a task to a specialist."""
    task = db.query(SpecialistTask).filter(SpecialistTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    service = TaskAssignmentService(db)
    task = service.reassign_task(task, request.specialist_id)

    # Get specialist name
    specialist = db.query(Specialist).filter(Specialist.id == task.specialist_id).first()

    return SpecialistTaskResponse(
        id=task.id,
        application_id=task.application_id,
        specialist_id=task.specialist_id,
        specialist_name=specialist.full_name if specialist else None,
        phase=task.phase,
        task_title=task.task_title,
        task_description=task.task_description,
        priority=task.priority,
        status=task.status,
        created_at=task.created_at,
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        due_date=task.due_date,
    )


@app.post("/api/admin/tasks/{task_id}/unassign", response_model=SpecialistTaskResponse, tags=["Admin"])
async def unassign_task(
    task_id: int,
    db: Session = Depends(get_db),
):
    """Unassign a task from its current specialist (return to queue)."""
    task = db.query(SpecialistTask).filter(SpecialistTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Store previous specialist for response
    previous_specialist_id = task.specialist_id

    # Unassign the task
    task.specialist_id = None
    task.status = "PENDING"  # Return to queue
    task.assigned_at = None

    db.commit()
    db.refresh(task)

    return SpecialistTaskResponse(
        id=task.id,
        application_id=task.application_id,
        specialist_id=task.specialist_id,
        specialist_name=None,
        phase=task.phase,
        task_title=task.task_title,
        task_description=task.task_description,
        priority=task.priority,
        status=task.status,
        created_at=task.created_at,
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        due_date=task.due_date,
    )


# ============================================
# Specialist Workbench
# ============================================

@app.get("/api/specialist/tasks", response_model=List[SpecialistTaskResponse], tags=["Specialist Workbench"])
async def get_my_tasks(
    status: Optional[str] = None,
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Get tasks assigned to the logged-in specialist."""
    query = db.query(SpecialistTask).filter(SpecialistTask.specialist_id == specialist.id)

    if status:
        query = query.filter(SpecialistTask.status == status.upper())
    else:
        # By default, show active tasks (not completed or skipped)
        query = query.filter(SpecialistTask.status.in_(["ASSIGNED", "IN_PROGRESS"]))

    tasks = query.order_by(SpecialistTask.priority, desc(SpecialistTask.created_at)).all()

    result = []
    for task in tasks:
        app_record = db.query(LoanApplication).filter(
            LoanApplication.application_id == task.application_id
        ).first()

        result.append(SpecialistTaskResponse(
            id=task.id,
            application_id=task.application_id,
            specialist_id=task.specialist_id,
            specialist_name=specialist.full_name,
            phase=task.phase,
            task_title=task.task_title,
            task_description=task.task_description,
            priority=task.priority,
            status=task.status,
            created_at=task.created_at,
            assigned_at=task.assigned_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
            due_date=task.due_date,
            customer_name=app_record.customer_name if app_record else None,
            loan_amount=app_record.loan_amount if app_record else None,
            current_workflow_phase=app_record.current_phase if app_record else None,
        ))

    return result


@app.get("/api/specialist/tasks/{task_id}", response_model=SpecialistTaskResponse, tags=["Specialist Workbench"])
async def get_task_details(
    task_id: int,
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Get detailed task info with application context."""
    task = db.query(SpecialistTask).filter(
        SpecialistTask.id == task_id,
        SpecialistTask.specialist_id == specialist.id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    app_record = db.query(LoanApplication).filter(
        LoanApplication.application_id == task.application_id
    ).first()

    return SpecialistTaskResponse(
        id=task.id,
        application_id=task.application_id,
        specialist_id=task.specialist_id,
        specialist_name=specialist.full_name,
        phase=task.phase,
        task_title=task.task_title,
        task_description=task.task_description,
        priority=task.priority,
        status=task.status,
        created_at=task.created_at,
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        due_date=task.due_date,
        customer_name=app_record.customer_name if app_record else None,
        loan_amount=app_record.loan_amount if app_record else None,
        current_workflow_phase=app_record.current_phase if app_record else None,
    )


@app.post("/api/specialist/tasks/{task_id}/start", response_model=SpecialistTaskResponse, tags=["Specialist Workbench"])
async def start_task(
    task_id: int,
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Mark task as in-progress."""
    task = db.query(SpecialistTask).filter(
        SpecialistTask.id == task_id,
        SpecialistTask.specialist_id == specialist.id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    if task.status not in ["ASSIGNED", "READY"]:
        raise HTTPException(status_code=400, detail=f"Cannot start task with status {task.status}")

    service = TaskAssignmentService(db)
    task = service.start_task(task)

    return SpecialistTaskResponse(
        id=task.id,
        application_id=task.application_id,
        specialist_id=task.specialist_id,
        specialist_name=specialist.full_name,
        phase=task.phase,
        task_title=task.task_title,
        task_description=task.task_description,
        priority=task.priority,
        status=task.status,
        created_at=task.created_at,
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        due_date=task.due_date,
    )


@app.post("/api/specialist/tasks/{task_id}/complete", tags=["Specialist Workbench"])
async def complete_specialist_task(
    task_id: int,
    request: CompleteTaskRequest,
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Complete task and advance workflow to next phase."""
    task = db.query(SpecialistTask).filter(
        SpecialistTask.id == task_id,
        SpecialistTask.specialist_id == specialist.id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    if task.status not in ["ASSIGNED", "IN_PROGRESS"]:
        raise HTTPException(status_code=400, detail=f"Cannot complete task with status {task.status}")

    # Complete the specialist task
    service = TaskAssignmentService(db)
    task = service.complete_task(task, notes=request.notes, data=request.data)

    # Also advance the workflow by calling the complete-current-task logic
    app_record = db.query(LoanApplication).filter_by(application_id=task.application_id).first()

    # Determine if we should advance the workflow
    # Special case: HUMAN_DECISION is handled by UNDERWRITING specialist
    # When completing UNDERWRITING task, if app is at HUMAN_DECISION, advance past it
    should_advance = False
    if app_record:
        if app_record.current_phase == task.phase:
            should_advance = True
        elif task.phase == "UNDERWRITING" and app_record.current_phase == "HUMAN_DECISION":
            # UNDERWRITING specialist completing task while app is at HUMAN_DECISION
            # This means UNDERWRITING was already done, now advance past HUMAN_DECISION
            should_advance = True

    if app_record and should_advance:
        # The application is at this phase, so advance it
        # We'll call the existing complete_current_task logic
        from workflow import LoanWorkflow

        # Get latest workflow state
        latest_state = db.query(WorkflowState).filter_by(
            application_id=task.application_id
        ).order_by(desc(WorkflowState.created_at)).first()

        state_data = latest_state.state_json.copy() if latest_state and latest_state.state_json else {}

        current_phase = app_record.current_phase
        current_phase_index = PHASE_ORDER.index(current_phase) if current_phase in PHASE_ORDER else -1

        if current_phase_index >= 0:
            # Populate mock data for the CURRENT phase
            completed_phase_data = generate_mock_data_for_phase(current_phase, task.application_id)
            state_data.update(completed_phase_data)

            # Check if this is the final phase
            is_final_phase = current_phase_index >= len(PHASE_ORDER) - 1

            if is_final_phase:
                state_data["workflow_status"] = "completed"
                state_data["end_state"] = "loan_closed"
                state_data["current_node"] = "end_loan_closed"
                state_data["is_in_progress_simulation"] = False
                app_record.status = "COMPLETED"
                app_record.end_state = "loan_closed"
                app_record.current_node = "end_loan_closed"
                app_record.completed_at = datetime.utcnow()
                next_phase = None
                next_node = "end_loan_closed"
            else:
                # Move to next phase
                next_phase = PHASE_ORDER[current_phase_index + 1]

                # Skip HUMAN_DECISION phase - specialists don't have a task for it
                # Auto-advance to COMMITMENT when completing UNDERWRITING or HUMAN_DECISION
                if next_phase == "HUMAN_DECISION":
                    # Also generate mock data for HUMAN_DECISION phase
                    hd_data = generate_mock_data_for_phase("HUMAN_DECISION", task.application_id)
                    state_data.update(hd_data)
                    # Skip to COMMITMENT
                    next_phase_index = PHASE_ORDER.index("HUMAN_DECISION") + 1
                    if next_phase_index < len(PHASE_ORDER):
                        next_phase = PHASE_ORDER[next_phase_index]

                next_node = PHASE_NODES.get(next_phase, [None])[0]

                app_record.current_phase = next_phase
                app_record.current_node = next_node
                app_record.updated_at = datetime.utcnow()

                state_data["current_phase"] = next_phase
                state_data["current_node"] = next_node
                state_data["workflow_status"] = "paused"

            # Create new state snapshot
            new_state = WorkflowState(
                application_id=task.application_id,
                state_json=state_data,
                checkpoint_name=f"specialist_completed_{current_phase.lower()}",
                phase=next_phase if not is_final_phase else current_phase,
            )
            db.add(new_state)

            # Log the completion
            completion_log = TransactionLog(
                application_id=task.application_id,
                event_type="SPECIALIST_TASK_COMPLETED",
                event_name=f"Specialist Completed: {current_phase}",
                description=f"Task completed by {specialist.full_name} ({specialist.specialty_type})",
                data={
                    "phase": current_phase,
                    "specialist_id": specialist.id,
                    "specialist_name": specialist.full_name,
                    "notes": request.notes,
                },
                source_agent="SpecialistWorkbench",
                source_node=app_record.current_node,
            )
            db.add(completion_log)

            db.commit()

    return {
        "success": True,
        "message": f"Task completed successfully",
        "task_id": task.id,
        "phase": task.phase,
        "next_phase_assigned": True,
    }


@app.post("/api/specialist/tasks/{task_id}/notes", response_model=SubtaskNoteResponse, tags=["Specialist Workbench"])
async def add_subtask_note(
    task_id: int,
    request: AddSubtaskNoteRequest,
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Add a note to a subtask."""
    task = db.query(SpecialistTask).filter(
        SpecialistTask.id == task_id,
        SpecialistTask.specialist_id == specialist.id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")

    # Create the note
    note = SubtaskNote(
        task_id=task_id,
        subtask_num=request.subtask_num,
        note_text=request.note_text,
        author_id=specialist.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return SubtaskNoteResponse(
        id=note.id,
        task_id=note.task_id,
        subtask_num=note.subtask_num,
        note_text=note.note_text,
        author_name=specialist.full_name,
        author_id=specialist.id,
        phase=task.phase,
        application_id=task.application_id,
        created_at=note.created_at,
    )


@app.get("/api/specialist/tasks/{task_id}/notes", response_model=List[SubtaskNoteResponse], tags=["Specialist Workbench"])
async def get_subtask_notes(
    task_id: int,
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Get all notes for a task."""
    task = db.query(SpecialistTask).filter(SpecialistTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    notes = db.query(SubtaskNote).filter(SubtaskNote.task_id == task_id).order_by(SubtaskNote.created_at).all()

    result = []
    for note in notes:
        author = db.query(Specialist).filter(Specialist.id == note.author_id).first()
        result.append(SubtaskNoteResponse(
            id=note.id,
            task_id=note.task_id,
            subtask_num=note.subtask_num,
            note_text=note.note_text,
            author_name=author.full_name if author else "Unknown",
            author_id=note.author_id,
            phase=task.phase,
            application_id=task.application_id,
            created_at=note.created_at,
        ))

    return result


@app.get("/api/applications/{application_id}/notes", response_model=List[SubtaskNoteResponse], tags=["Applications"])
async def get_application_notes(
    application_id: str,
    db: Session = Depends(get_db),
):
    """Get all notes for an application across all tasks (for main page display)."""
    tasks = db.query(SpecialistTask).filter(SpecialistTask.application_id == application_id).all()

    if not tasks:
        return []

    task_ids = [t.id for t in tasks]
    notes = db.query(SubtaskNote).filter(SubtaskNote.task_id.in_(task_ids)).order_by(SubtaskNote.created_at).all()

    result = []
    task_map = {t.id: t for t in tasks}
    for note in notes:
        task = task_map.get(note.task_id)
        author = db.query(Specialist).filter(Specialist.id == note.author_id).first()
        result.append(SubtaskNoteResponse(
            id=note.id,
            task_id=note.task_id,
            subtask_num=note.subtask_num,
            note_text=note.note_text,
            author_name=author.full_name if author else "Unknown",
            author_id=note.author_id,
            phase=task.phase if task else "Unknown",
            application_id=application_id,
            created_at=note.created_at,
        ))

    return result


@app.get("/api/specialist/history", response_model=List[SpecialistTaskResponse], tags=["Specialist Workbench"])
async def get_task_history(
    limit: int = Query(50, ge=1, le=200),
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Get completed task history for specialist."""
    tasks = db.query(SpecialistTask).filter(
        SpecialistTask.specialist_id == specialist.id,
        SpecialistTask.status == "COMPLETED",
    ).order_by(desc(SpecialistTask.completed_at)).limit(limit).all()

    result = []
    for task in tasks:
        app_record = db.query(LoanApplication).filter(
            LoanApplication.application_id == task.application_id
        ).first()

        result.append(SpecialistTaskResponse(
            id=task.id,
            application_id=task.application_id,
            specialist_id=task.specialist_id,
            specialist_name=specialist.full_name,
            phase=task.phase,
            task_title=task.task_title,
            task_description=task.task_description,
            priority=task.priority,
            status=task.status,
            created_at=task.created_at,
            assigned_at=task.assigned_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
            due_date=task.due_date,
            customer_name=app_record.customer_name if app_record else None,
            loan_amount=app_record.loan_amount if app_record else None,
            current_workflow_phase=app_record.current_phase if app_record else None,
        ))

    return result


@app.get("/api/specialist/stats", tags=["Specialist Workbench"])
async def get_specialist_stats(
    specialist: Specialist = Depends(get_current_specialist),
    db: Session = Depends(get_db),
):
    """Get performance stats for specialist."""
    service = TaskAssignmentService(db)
    stats = service.get_specialist_stats(specialist.id)

    return {
        "specialist_id": specialist.id,
        "specialist_name": specialist.full_name,
        "specialty_type": specialist.specialty_type,
        **stats,
    }


# ============================================
# Simulation / Supervisor Mode
# ============================================

@app.get("/api/simulation/tasks", tags=["Simulation"])
async def get_all_simulation_tasks(
    application_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all tasks grouped by phase and specialist for supervisor view."""
    query = db.query(SpecialistTask)

    if application_id:
        query = query.filter(SpecialistTask.application_id == application_id)

    tasks = query.order_by(SpecialistTask.application_id, SpecialistTask.phase).all()

    result = []
    for task in tasks:
        # Get specialist info
        specialist = None
        if task.specialist_id:
            specialist = db.query(Specialist).filter(Specialist.id == task.specialist_id).first()

        # Get application info
        app_record = db.query(LoanApplication).filter(
            LoanApplication.application_id == task.application_id
        ).first()

        result.append({
            "id": task.id,
            "application_id": task.application_id,
            "phase": task.phase,
            "task_title": task.task_title,
            "task_description": task.task_description,
            "status": task.status,
            "priority": task.priority,
            "specialist_id": task.specialist_id,
            "specialist_name": specialist.full_name if specialist else None,
            "specialist_type": specialist.specialty_type if specialist else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "assigned_at": task.assigned_at.isoformat() if task.assigned_at else None,
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "customer_name": app_record.customer_name if app_record else None,
            "loan_amount": app_record.loan_amount if app_record else None,
            "application_phase": app_record.current_phase if app_record else None,
            "application_status": app_record.status if app_record else None,
        })

    return result


@app.post("/api/simulation/start", tags=["Simulation"])
async def start_simulation(
    request: LoanApplicationRequest,
    db: Session = Depends(get_db),
):
    """Start a new simulation - creates application and all specialist tasks."""
    # Generate application ID
    application_id = f"HLT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

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

    # Create application record
    app_record = LoanApplication(
        application_id=application_id,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        property_address=request.property_address,
        loan_amount=request.loan_amount,
        original_borrower=request.original_borrower,
        status="IN_PROGRESS",
        current_phase="INTAKE",
        current_node="intake",
    )
    db.add(app_record)

    # Create initial workflow state
    workflow_state = WorkflowState(
        application_id=application_id,
        state_json=initial_state,
        checkpoint_name="simulation_start",
        phase="INTAKE",
    )
    db.add(workflow_state)

    # Log transaction
    log_entry = TransactionLog(
        application_id=application_id,
        event_type="SIMULATION_STARTED",
        event_name="Simulation Started",
        description=f"Step-by-step simulation started for {request.customer_name}",
        data={"customer_name": request.customer_name, "loan_amount": request.loan_amount},
        source_agent="Supervisor",
        source_node="simulation_start",
    )
    db.add(log_entry)

    db.commit()

    # Create specialist tasks for all phases
    service = TaskAssignmentService(db)
    tasks = service.create_tasks_for_application(application_id)

    # Get the created tasks with specialist info
    task_list = []
    for task in tasks:
        specialist = None
        if task.specialist_id:
            specialist = db.query(Specialist).filter(Specialist.id == task.specialist_id).first()
        task_list.append({
            "phase": task.phase,
            "task_title": task.task_title,
            "status": task.status,
            "specialist_name": specialist.full_name if specialist else "Unassigned",
            "specialist_type": specialist.specialty_type if specialist else None,
        })

    return {
        "success": True,
        "application_id": application_id,
        "customer_name": request.customer_name,
        "current_phase": "INTAKE",
        "tasks_created": len(tasks),
        "tasks": task_list,
        "message": "Simulation started. INTAKE task assigned to intake specialist.",
    }


@app.post("/api/simulation/advance/{application_id}", tags=["Simulation"])
async def advance_simulation(
    application_id: str,
    db: Session = Depends(get_db),
):
    """Advance simulation to next phase (supervisory agent action)."""
    # Get application
    app_record = db.query(LoanApplication).filter_by(application_id=application_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    if app_record.status == "COMPLETED":
        return {
            "success": False,
            "message": "Application already completed",
            "application_id": application_id,
            "current_phase": app_record.current_phase,
            "status": app_record.status,
        }

    # Find the current active task
    current_task = db.query(SpecialistTask).filter(
        SpecialistTask.application_id == application_id,
        SpecialistTask.status.in_(["ASSIGNED", "IN_PROGRESS", "READY"]),
    ).first()

    if not current_task:
        return {
            "success": False,
            "message": "No active task to advance",
            "application_id": application_id,
            "current_phase": app_record.current_phase,
        }

    # Get the specialist who should complete this
    specialist = None
    if current_task.specialist_id:
        specialist = db.query(Specialist).filter(Specialist.id == current_task.specialist_id).first()

    # Complete the task using TaskAssignmentService
    service = TaskAssignmentService(db)

    # If task is READY but not assigned, assign it first
    if current_task.status == "READY" and not current_task.specialist_id:
        service.auto_assign_task(current_task)
        db.refresh(current_task)
        if current_task.specialist_id:
            specialist = db.query(Specialist).filter(Specialist.id == current_task.specialist_id).first()

    completed_phase = current_task.phase
    service.complete_task(current_task, notes=f"Completed by Supervisor Agent")

    # Also advance the main workflow
    current_phase = app_record.current_phase
    current_phase_index = PHASE_ORDER.index(current_phase) if current_phase in PHASE_ORDER else -1

    if current_phase_index >= 0:
        # Generate mock data for the completed phase
        completed_phase_data = generate_mock_data_for_phase(current_phase, application_id)

        # Get latest workflow state
        latest_state = db.query(WorkflowState).filter_by(
            application_id=application_id
        ).order_by(desc(WorkflowState.created_at)).first()

        state_data = latest_state.state_json.copy() if latest_state and latest_state.state_json else {}
        state_data.update(completed_phase_data)

        # Check if final phase
        is_final_phase = current_phase_index >= len(PHASE_ORDER) - 1

        if is_final_phase:
            state_data["workflow_status"] = "completed"
            state_data["end_state"] = "loan_closed"
            app_record.status = "COMPLETED"
            app_record.end_state = "loan_closed"
            app_record.completed_at = datetime.utcnow()
            next_phase = None
        else:
            next_phase = PHASE_ORDER[current_phase_index + 1]
            app_record.current_phase = next_phase
            app_record.current_node = PHASE_NODES.get(next_phase, [None])[0]
            state_data["current_phase"] = next_phase

        # Create new state snapshot
        new_state = WorkflowState(
            application_id=application_id,
            state_json=state_data,
            checkpoint_name=f"simulation_completed_{current_phase.lower()}",
            phase=next_phase if next_phase else current_phase,
        )
        db.add(new_state)

        # Log the advancement
        log_entry = TransactionLog(
            application_id=application_id,
            event_type="SIMULATION_ADVANCED",
            event_name=f"Phase Completed: {current_phase}",
            description=f"Supervisor advanced from {current_phase} to {next_phase or 'COMPLETED'}",
            data={
                "completed_phase": current_phase,
                "next_phase": next_phase,
                "specialist": specialist.full_name if specialist else "Unassigned",
            },
            source_agent="Supervisor",
            source_node=app_record.current_node,
        )
        db.add(log_entry)

        db.commit()

        # Get next task info
        next_task = None
        if not is_final_phase:
            next_task = db.query(SpecialistTask).filter(
                SpecialistTask.application_id == application_id,
                SpecialistTask.phase == next_phase,
            ).first()

        next_specialist = None
        if next_task and next_task.specialist_id:
            next_specialist = db.query(Specialist).filter(Specialist.id == next_task.specialist_id).first()

        return {
            "success": True,
            "application_id": application_id,
            "completed_phase": completed_phase,
            "completed_by": specialist.full_name if specialist else "Unassigned",
            "next_phase": next_phase,
            "next_specialist": next_specialist.full_name if next_specialist else None,
            "next_task_status": next_task.status if next_task else None,
            "is_completed": is_final_phase,
            "message": f"Advanced from {completed_phase} to {next_phase}" if next_phase else "Application completed!",
        }

    return {
        "success": False,
        "message": "Could not determine current phase",
        "application_id": application_id,
    }


@app.get("/api/simulation/status/{application_id}", tags=["Simulation"])
async def get_simulation_status(
    application_id: str,
    db: Session = Depends(get_db),
):
    """Get detailed simulation status for an application."""
    app_record = db.query(LoanApplication).filter_by(application_id=application_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get all tasks for this application
    tasks = db.query(SpecialistTask).filter(
        SpecialistTask.application_id == application_id
    ).order_by(SpecialistTask.created_at).all()

    task_list = []
    for task in tasks:
        specialist = None
        if task.specialist_id:
            specialist = db.query(Specialist).filter(Specialist.id == task.specialist_id).first()

        task_list.append({
            "phase": task.phase,
            "task_title": task.task_title,
            "status": task.status,
            "specialist_name": specialist.full_name if specialist else "Unassigned",
            "specialist_type": specialist.specialty_type if specialist else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        })

    # Get recent logs
    logs = db.query(TransactionLog).filter(
        TransactionLog.application_id == application_id
    ).order_by(desc(TransactionLog.timestamp)).limit(10).all()

    log_list = [{
        "event_type": log.event_type,
        "event_name": log.event_name,
        "description": log.description,
        "timestamp": log.timestamp.isoformat(),
    } for log in logs]

    return {
        "application_id": application_id,
        "customer_name": app_record.customer_name,
        "loan_amount": app_record.loan_amount,
        "property_address": app_record.property_address,
        "status": app_record.status,
        "current_phase": app_record.current_phase,
        "created_at": app_record.created_at.isoformat() if app_record.created_at else None,
        "completed_at": app_record.completed_at.isoformat() if app_record.completed_at else None,
        "tasks": task_list,
        "recent_logs": log_list,
    }


# ============================================
# Workflow Definition Management
# ============================================

@app.get("/api/admin/workflow-tasks", tags=["Workflow Config"])
async def get_workflow_tasks(db: Session = Depends(get_db)):
    """Get all workflow task definitions with subtasks and checklist items."""
    tasks = db.query(WorkflowTaskDefinition).filter(
        WorkflowTaskDefinition.is_active == True
    ).order_by(WorkflowTaskDefinition.order_index).all()

    result = []
    for task in tasks:
        subtasks_data = []
        for subtask in task.subtasks:
            if not subtask.is_active:
                continue
            checklist_data = []
            for item in subtask.checklist_items:
                if not item.is_active:
                    continue
                checklist_data.append({
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "order_index": item.order_index,
                    "is_required": item.is_required,
                    "activity_category": item.activity_category,
                })
            subtasks_data.append({
                "id": subtask.id,
                "name": subtask.name,
                "description": subtask.description,
                "order_index": subtask.order_index,
                "default_specialist_id": subtask.default_specialist_id,
                "default_specialist_name": subtask.default_specialist.full_name if subtask.default_specialist else None,
                "estimated_duration": subtask.estimated_duration,
                "sla_hours": subtask.sla_hours,
                "is_required": subtask.is_required,
                "checklist_items": checklist_data,
            })
        result.append({
            "id": task.id,
            "name": task.name,
            "description": task.description,
            "phase_code": task.phase_code,
            "order_index": task.order_index,
            "color": task.color,
            "icon": task.icon,
            "sla_hours": task.sla_hours,
            "subtasks": subtasks_data,
        })

    return result


@app.post("/api/admin/workflow-tasks", tags=["Workflow Config"])
async def create_workflow_task(
    request: CreateWorkflowTaskRequest,
    db: Session = Depends(get_db)
):
    """Create a new workflow task definition."""
    # Check if phase_code already exists
    existing = db.query(WorkflowTaskDefinition).filter(
        WorkflowTaskDefinition.phase_code == request.phase_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Phase code '{request.phase_code}' already exists")

    # Get max order_index
    max_order = db.query(WorkflowTaskDefinition).count()

    task = WorkflowTaskDefinition(
        name=request.name,
        phase_code=request.phase_code,
        description=request.description,
        color=request.color,
        icon=request.icon,
        order_index=max_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "phase_code": task.phase_code,
        "order_index": task.order_index,
        "color": task.color,
        "icon": task.icon,
        "subtasks": [],
    }


@app.put("/api/admin/workflow-tasks/{task_id}", tags=["Workflow Config"])
async def update_workflow_task(
    task_id: int,
    request: UpdateWorkflowTaskRequest,
    db: Session = Depends(get_db)
):
    """Update a workflow task definition."""
    task = db.query(WorkflowTaskDefinition).filter(
        WorkflowTaskDefinition.id == task_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if request.name is not None:
        task.name = request.name
    if request.description is not None:
        task.description = request.description
    if request.color is not None:
        task.color = request.color
    if request.icon is not None:
        task.icon = request.icon
    if request.order_index is not None:
        task.order_index = request.order_index
    if request.sla_hours is not None:
        task.sla_hours = request.sla_hours if request.sla_hours > 0 else None

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    return {"message": "Task updated", "id": task.id}


@app.delete("/api/admin/workflow-tasks/{task_id}", tags=["Workflow Config"])
async def delete_workflow_task(task_id: int, db: Session = Depends(get_db)):
    """Delete (soft) a workflow task definition."""
    task = db.query(WorkflowTaskDefinition).filter(
        WorkflowTaskDefinition.id == task_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_active = False
    task.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Task deleted", "id": task_id}


@app.post("/api/admin/workflow-tasks/{task_id}/subtasks", tags=["Workflow Config"])
async def create_subtask(
    task_id: int,
    request: CreateSubtaskRequest,
    db: Session = Depends(get_db)
):
    """Create a new subtask under a workflow task."""
    task = db.query(WorkflowTaskDefinition).filter(
        WorkflowTaskDefinition.id == task_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get max order_index for this task
    max_order = db.query(SubTaskDefinition).filter(
        SubTaskDefinition.task_id == task_id
    ).count()

    subtask = SubTaskDefinition(
        task_id=task_id,
        name=request.name,
        description=request.description,
        default_specialist_id=request.default_specialist_id,
        estimated_duration=request.estimated_duration,
        sla_hours=request.sla_hours,
        is_required=request.is_required,
        order_index=max_order,
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    return {
        "id": subtask.id,
        "task_id": subtask.task_id,
        "name": subtask.name,
        "description": subtask.description,
        "order_index": subtask.order_index,
        "default_specialist_id": subtask.default_specialist_id,
        "estimated_duration": subtask.estimated_duration,
        "sla_hours": subtask.sla_hours,
        "is_required": subtask.is_required,
        "checklist_items": [],
    }


@app.put("/api/admin/subtasks/{subtask_id}", tags=["Workflow Config"])
async def update_subtask(
    subtask_id: int,
    request: UpdateSubtaskRequest,
    db: Session = Depends(get_db)
):
    """Update a subtask definition."""
    subtask = db.query(SubTaskDefinition).filter(
        SubTaskDefinition.id == subtask_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    if request.name is not None:
        subtask.name = request.name
    if request.description is not None:
        subtask.description = request.description
    if request.default_specialist_id is not None:
        subtask.default_specialist_id = request.default_specialist_id if request.default_specialist_id > 0 else None
    if request.estimated_duration is not None:
        subtask.estimated_duration = request.estimated_duration
    if request.sla_hours is not None:
        subtask.sla_hours = request.sla_hours if request.sla_hours > 0 else None
    if request.is_required is not None:
        subtask.is_required = request.is_required
    if request.order_index is not None:
        subtask.order_index = request.order_index

    subtask.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(subtask)

    return {"message": "Subtask updated", "id": subtask.id, "sla_hours": subtask.sla_hours}


@app.delete("/api/admin/subtasks/{subtask_id}", tags=["Workflow Config"])
async def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    """Delete (soft) a subtask definition."""
    subtask = db.query(SubTaskDefinition).filter(
        SubTaskDefinition.id == subtask_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    subtask.is_active = False
    subtask.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Subtask deleted", "id": subtask_id}


@app.post("/api/admin/subtasks/{subtask_id}/checklist", tags=["Workflow Config"])
async def create_checklist_item(
    subtask_id: int,
    request: CreateChecklistItemRequest,
    db: Session = Depends(get_db)
):
    """Create a new checklist item under a subtask."""
    subtask = db.query(SubTaskDefinition).filter(
        SubTaskDefinition.id == subtask_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    # Get max order_index for this subtask
    max_order = db.query(ChecklistItemDefinition).filter(
        ChecklistItemDefinition.subtask_id == subtask_id
    ).count()

    item = ChecklistItemDefinition(
        subtask_id=subtask_id,
        name=request.name,
        description=request.description,
        is_required=request.is_required,
        activity_category=request.activity_category,
        order_index=max_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "subtask_id": item.subtask_id,
        "name": item.name,
        "description": item.description,
        "order_index": item.order_index,
        "is_required": item.is_required,
        "activity_category": item.activity_category,
    }


@app.put("/api/admin/checklist/{item_id}", tags=["Workflow Config"])
async def update_checklist_item(
    item_id: int,
    request: UpdateChecklistItemRequest,
    db: Session = Depends(get_db)
):
    """Update a checklist item definition."""
    item = db.query(ChecklistItemDefinition).filter(
        ChecklistItemDefinition.id == item_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    if request.name is not None:
        item.name = request.name
    if request.description is not None:
        item.description = request.description
    if request.is_required is not None:
        item.is_required = request.is_required
    if request.activity_category is not None:
        item.activity_category = request.activity_category
    if request.order_index is not None:
        item.order_index = request.order_index

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    return {"message": "Checklist item updated", "id": item.id}


@app.delete("/api/admin/checklist/{item_id}", tags=["Workflow Config"])
async def delete_checklist_item(item_id: int, db: Session = Depends(get_db)):
    """Delete (soft) a checklist item definition."""
    item = db.query(ChecklistItemDefinition).filter(
        ChecklistItemDefinition.id == item_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    item.is_active = False
    item.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Checklist item deleted", "id": item_id}


@app.put("/api/admin/workflow-tasks/reorder", tags=["Workflow Config"])
async def reorder_workflow_tasks(
    task_orders: List[dict],  # [{"id": 1, "order_index": 0}, ...]
    db: Session = Depends(get_db)
):
    """Reorder workflow tasks."""
    for item in task_orders:
        task = db.query(WorkflowTaskDefinition).filter(
            WorkflowTaskDefinition.id == item["id"]
        ).first()
        if task:
            task.order_index = item["order_index"]
            task.updated_at = datetime.utcnow()

    db.commit()
    return {"message": "Tasks reordered"}


@app.put("/api/admin/subtasks/reorder", tags=["Workflow Config"])
async def reorder_subtasks(
    subtask_orders: List[dict],  # [{"id": 1, "order_index": 0}, ...]
    db: Session = Depends(get_db)
):
    """Reorder subtasks within a task."""
    for item in subtask_orders:
        subtask = db.query(SubTaskDefinition).filter(
            SubTaskDefinition.id == item["id"]
        ).first()
        if subtask:
            subtask.order_index = item["order_index"]
            subtask.updated_at = datetime.utcnow()

    db.commit()
    return {"message": "Subtasks reordered"}


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
