"""LangGraph workflow definition for Loan Assumption Process."""
import sys
import os
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Dict, Any, Optional
from datetime import datetime
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from models.state import LoanState, create_initial_state
from database.models import LoanApplication, WorkflowState, HumanTask, TransactionLog, AgentExecution, MockAPICall
from database.connection import SessionLocal

# Import mock APIs
from mock_apis import (
    MockCaseOptimizerAPI,
    MockEligibilityAPI,
    MockDocuSignAPI,
    MockDocumentService,
    MockNotificationService,
    MockUnderwritingService,
    MockTitleAgencyAPI,
    MockMSPService,
)


def get_db_session():
    """Get a new database session."""
    return SessionLocal()


def log_transaction(application_id: str, event_type: str, event_name: str, description: str, data: Dict = None, source_agent: str = "workflow"):
    """Log a transaction to the database."""
    try:
        session = get_db_session()
        log = TransactionLog(
            application_id=application_id,
            event_type=event_type,
            event_name=event_name,
            description=description,
            data=data,
            source_agent=source_agent,
            source_node=source_agent,
        )
        session.add(log)
        session.commit()
        session.close()
    except Exception as e:
        print(f"Log error: {e}")


def log_agent_execution(
    application_id: str,
    agent_name: str,
    phase: str,
    input_state: Dict,
    output_state: Dict,
    decision: str,
    status: str = "COMPLETED",
    started_at: datetime = None,
):
    """Log agent execution to database."""
    try:
        session = get_db_session()
        now = datetime.utcnow()
        started = started_at or now
        execution = AgentExecution(
            application_id=application_id,
            agent_name=agent_name,
            agent_type="AGENT",
            phase=phase,
            input_state={"summary": f"Processing {agent_name}"},
            output_state=output_state,
            decision=decision,
            status=status,
            started_at=started,
            completed_at=now,
            duration_ms=int((now - started).total_seconds() * 1000),
        )
        session.add(execution)
        session.commit()
        session.close()
    except Exception as e:
        print(f"Execution log error: {e}")


def log_api_call(
    application_id: str,
    api_name: str,
    endpoint: str,
    method: str,
    request_data: Dict,
    response_data: Dict,
    status_code: int = 200,
):
    """Log mock API call to database."""
    try:
        session = get_db_session()
        import random
        call = MockAPICall(
            application_id=application_id,
            api_name=api_name,
            endpoint=endpoint,
            method=method,
            request_data=request_data,
            response_data=response_data,
            status_code=status_code,
            duration_ms=random.randint(50, 300),
        )
        session.add(call)
        session.commit()
        session.close()
    except Exception as e:
        print(f"API log error: {e}")


def update_application_status(application_id: str, phase: str, node: str, status: str = "IN_PROGRESS"):
    """Update application status in database during workflow execution."""
    try:
        session = get_db_session()
        app = session.query(LoanApplication).filter_by(application_id=application_id).first()
        if app:
            app.current_phase = phase
            app.current_node = node
            app.status = status
            session.commit()
        session.close()
    except Exception as e:
        print(f"Status update error: {e}")


def preserve_state(state: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """Merge updates into the existing state, preserving all fields."""
    result = dict(state)  # Copy all existing state
    result.update(updates)  # Apply updates
    return result


# ============================================
# In-Progress Simulation Configuration
# ============================================

# All possible stopping points for in-progress simulation
# Each entry: (phase, node, task_description)
IN_PROGRESS_STOP_POINTS = [
    ("INTAKE", "intake_node", "Eligibility Check"),
    ("APPLICATION", "application_node", "Application Sent"),
    ("DISCLOSURE", "disclosure_node", "Disclosure Package"),
    ("LOAN_REVIEW", "loan_review_node", "Document Review"),
    ("UNDERWRITING", "underwriting_node", "Underwriting Checklist"),
    ("HUMAN_DECISION", "human_decision_node", "Underwriter Decision"),
    ("COMMITMENT", "commitment_node", "Commitment Letter"),
    ("CLOSING", "closing_node", "Closing Packet"),
    ("POST_CLOSING", "maintenance_node", "MSP Maintenance"),
]

# Fields to clear for each phase when in-progress (all subsequent phases will have null data)
PHASE_FIELDS_TO_CLEAR = {
    "INTAKE": ["eligibility_status", "eligibility_reasons", "case_optimizer_result"],
    "APPLICATION": ["app_status", "docusign_envelope_id", "sla_days", "application_sent_at", "application_returned_at"],
    "DISCLOSURE": ["disclosure_package"],
    "LOAN_REVIEW": ["docs_needed", "doc_status", "document_collection", "missing_docs_letter", "doc_request_count"],
    "UNDERWRITING": ["uw_checklist_complete", "uw_assigned_to", "uw_readiness", "uw_review_count"],
    "HUMAN_DECISION": ["uw_decision", "uw_decision_by", "uw_decision_at", "uw_decision_notes"],
    "COMMITMENT": ["commitment_letter", "call_agent_assigned", "review_completed"],
    "CLOSING": ["closing_packet", "title_agency_notified"],
    "POST_CLOSING": ["closing_reviewed", "msp_status", "msp_completed_at"],
}

# Phase order for determining which fields to clear
PHASE_ORDER_FOR_CLEARING = [
    "INTAKE", "APPLICATION", "DISCLOSURE", "LOAN_REVIEW",
    "UNDERWRITING", "HUMAN_DECISION", "COMMITMENT", "CLOSING", "POST_CLOSING"
]


def get_random_stop_point():
    """Get a random stopping point for in-progress simulation."""
    import random
    return random.choice(IN_PROGRESS_STOP_POINTS)


def clear_subsequent_phase_data(state: Dict[str, Any], current_phase: str, include_current: bool = False) -> Dict[str, Any]:
    """Clear all data for phases after (and optionally including) the current in-progress phase."""
    result = dict(state)

    try:
        current_index = PHASE_ORDER_FOR_CLEARING.index(current_phase)
    except ValueError:
        return result

    # Determine starting index - include current phase if specified
    start_index = current_index if include_current else current_index + 1

    # Clear fields for all phases from start_index onwards
    for i in range(start_index, len(PHASE_ORDER_FOR_CLEARING)):
        phase = PHASE_ORDER_FOR_CLEARING[i]
        fields = PHASE_FIELDS_TO_CLEAR.get(phase, [])
        for field in fields:
            result[field] = None

    return result


def should_stop_at_node(state: Dict[str, Any], current_node: str) -> bool:
    """Check if workflow should stop at this node for in-progress simulation."""
    simulation_type = state.get("simulation_type")
    stop_point = state.get("_in_progress_stop_point")

    if simulation_type != "in_progress" or not stop_point:
        return False

    return stop_point[1] == current_node


def create_in_progress_state(state: Dict[str, Any], phase: str, node: str, task: str) -> Dict[str, Any]:
    """Create the state for an in-progress stop, clearing current and all subsequent data."""
    output = {
        "current_phase": phase,
        "current_node": node,
        "workflow_status": "paused",
        "in_progress_task": task,
        "is_in_progress_simulation": True,
    }

    # Clear current phase AND all subsequent phase data (include_current=True)
    # The in-progress task has no data until user completes it
    result = preserve_state(state, output)
    result = clear_subsequent_phase_data(result, phase, include_current=True)

    return result


def intake_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 1: Verify caller and check eligibility."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "INTAKE", "intake_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "intake_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="intake_node")
        output = create_in_progress_state(state, "INTAKE", "intake_node", stop_point[2])
        log_agent_execution(application_id, "intake_node", "INTAKE", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})
    property_address = state.get("property_address", "")
    loan_amount = state.get("loan_amount", 0)
    original_borrower = state.get("original_borrower", "")

    case_optimizer = MockCaseOptimizerAPI()
    eligibility_api = MockEligibilityAPI()

    # Verify caller
    verification_request = {
        "caller_name": customer_profile.get("name", ""),
        "ssn_last_four": customer_profile.get("ssn_last_four", ""),
        "property_address": property_address,
    }
    verification = case_optimizer.verify_caller(
        application_id=application_id,
        caller_name=customer_profile.get("name", ""),
        ssn_last_four=customer_profile.get("ssn_last_four", ""),
        property_address=property_address,
    )
    log_api_call(application_id, "CaseOptimizer", "/verify-caller", "POST", verification_request, verification)

    if not verification.get("success") or not verification.get("caller_verified"):
        log_transaction(application_id, "DECISION", "Verification Failed", "Caller verification failed", source_agent="intake_node")
        output = {
            "eligibility_status": "ineligible",
            "eligibility_reasons": ["Caller verification failed"],
            "current_phase": "INTAKE",
            "current_node": "intake_node",
            "workflow_status": "completed",
            "end_state": "ineligible",
        }
        log_agent_execution(application_id, "intake_node", "INTAKE", state, output, "ineligible", started_at=started_at)
        return preserve_state(state, output)

    # Check eligibility
    eligibility_request = {
        "loan_amount": loan_amount,
        "property_address": property_address,
        "original_borrower": original_borrower,
    }
    eligibility = eligibility_api.check_eligibility(
        application_id=application_id,
        loan_amount=loan_amount,
        property_address=property_address,
        original_borrower=original_borrower,
    )
    log_api_call(application_id, "EligibilityAPI", "/check-eligibility", "POST", eligibility_request, eligibility)

    if eligibility.get("is_eligible"):
        log_transaction(application_id, "DECISION", "Eligible", "Loan is eligible for assumption", source_agent="intake_node")
        output = {
            "eligibility_status": "eligible",
            "eligibility_reasons": eligibility.get("next_steps", []),
            "current_phase": "APPLICATION",
            "current_node": "application_node",
            "customer_profile": {**customer_profile, "is_authorized": True},
        }
        log_agent_execution(application_id, "intake_node", "INTAKE", state, output, "eligible", started_at=started_at)
        return preserve_state(state, output)
    else:
        log_transaction(application_id, "DECISION", "Ineligible", "Loan is not eligible", source_agent="intake_node")
        output = {
            "eligibility_status": "ineligible",
            "eligibility_reasons": eligibility.get("ineligibility_reasons", []),
            "current_phase": "INTAKE",
            "current_node": "intake_node",
            "workflow_status": "completed",
            "end_state": "ineligible",
        }
        log_agent_execution(application_id, "intake_node", "INTAKE", state, output, "ineligible", started_at=started_at)
        return preserve_state(state, output)


def application_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 2: Send application via DocuSign."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "APPLICATION", "application_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "application_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="application_node")
        output = create_in_progress_state(state, "APPLICATION", "application_node", stop_point[2])
        log_agent_execution(application_id, "application_node", "APPLICATION", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})

    docusign = MockDocuSignAPI()

    # Send application
    request_data = {
        "recipient_email": customer_profile.get("email", ""),
        "recipient_name": customer_profile.get("name", ""),
        "documents": [{"name": "Loan Assumption Application"}],
    }
    envelope = docusign.create_envelope(
        application_id=application_id,
        recipient_email=customer_profile.get("email", ""),
        recipient_name=customer_profile.get("name", ""),
        documents=[{"name": "Loan Assumption Application"}],
    )
    log_api_call(application_id, "DocuSign", "/envelopes", "POST", request_data, envelope)

    if envelope.get("success"):
        log_transaction(application_id, "STATE_CHANGE", "Application Sent", "Application sent via DocuSign", source_agent="application_node")
        output = {
            "app_status": "complete",
            "docusign_envelope_id": envelope.get("envelope_id"),
            "current_phase": "DISCLOSURE",
            "current_node": "disclosure_node",
        }
        log_agent_execution(application_id, "application_node", "APPLICATION", state, output, "complete", started_at=started_at)
        return preserve_state(state, output)
    else:
        output = {
            "app_status": "incomplete",
            "current_phase": "APPLICATION",
            "current_node": "application_node",
            "workflow_status": "completed",
            "end_state": "incomplete",
        }
        log_agent_execution(application_id, "application_node", "APPLICATION", state, output, "incomplete", started_at=started_at)
        return preserve_state(state, output)


def disclosure_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 3: Create and send disclosure package."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "DISCLOSURE", "disclosure_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "disclosure_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="disclosure_node")
        output = create_in_progress_state(state, "DISCLOSURE", "disclosure_node", stop_point[2])
        log_agent_execution(application_id, "disclosure_node", "DISCLOSURE", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})
    loan_amount = state.get("loan_amount", 0)
    property_address = state.get("property_address", "")

    doc_service = MockDocumentService()

    # Create disclosure package
    request_data = {
        "customer_name": customer_profile.get("name", ""),
        "loan_amount": loan_amount,
        "property_address": property_address,
    }
    package = doc_service.create_disclosure_package(
        application_id=application_id,
        customer_name=customer_profile.get("name", ""),
        loan_amount=loan_amount,
        property_address=property_address,
    )
    log_api_call(application_id, "DocumentService", "/disclosure-package", "POST", request_data, package)

    if package.get("success"):
        log_transaction(application_id, "STATE_CHANGE", "Disclosure Created", "Disclosure package created", source_agent="disclosure_node")
        output = {
            "disclosure_package": {
                "document_ids": [d["document_id"] for d in package.get("documents", [])],
                "status": "sent",
            },
            "current_phase": "LOAN_REVIEW",
            "current_node": "loan_review_node",
        }
        log_agent_execution(application_id, "disclosure_node", "DISCLOSURE", state, output, "created", started_at=started_at)
        return preserve_state(state, output)
    else:
        output = {
            "current_phase": "DISCLOSURE",
            "current_node": "disclosure_node",
            "last_error": "Failed to create disclosure",
        }
        log_agent_execution(application_id, "disclosure_node", "DISCLOSURE", state, output, "failed", "FAILED", started_at=started_at)
        return preserve_state(state, output)


def loan_review_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 4: Check for required documents."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "LOAN_REVIEW", "loan_review_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "loan_review_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="loan_review_node")
        output = create_in_progress_state(state, "LOAN_REVIEW", "loan_review_node", stop_point[2])
        log_agent_execution(application_id, "loan_review_node", "LOAN_REVIEW", state, output, "in_progress", started_at=started_at)
        return output

    doc_request_count = state.get("doc_request_count", 0)

    doc_service = MockDocumentService()

    # Check documents - simulate some are received
    request_data = {"received_documents": ["Photo ID", "Proof of Income", "Bank Statements (3 months)"]}
    check = doc_service.check_required_documents(
        application_id=application_id,
        received_documents=["Photo ID", "Proof of Income", "Bank Statements (3 months)"],
    )
    log_api_call(application_id, "DocumentService", "/check-documents", "POST", request_data, check)

    if check.get("all_documents_received"):
        log_transaction(application_id, "DECISION", "Docs Complete", "All documents received", source_agent="loan_review_node")
        output = {
            "docs_needed": False,
            "doc_status": "complete",
            "current_phase": "UNDERWRITING",
            "current_node": "underwriting_node",
        }
        log_agent_execution(application_id, "loan_review_node", "LOAN_REVIEW", state, output, "docs_complete", started_at=started_at)
        return preserve_state(state, output)
    else:
        if doc_request_count >= 2:
            log_transaction(application_id, "DECISION", "Withdrawn", "Documents not received", source_agent="loan_review_node")
            output = {
                "doc_status": "withdrawn",
                "current_phase": "LOAN_REVIEW",
                "current_node": "loan_review_node",
                "workflow_status": "completed",
                "end_state": "withdrawn",
            }
            log_agent_execution(application_id, "loan_review_node", "LOAN_REVIEW", state, output, "withdrawn", started_at=started_at)
            return preserve_state(state, output)
        output = {
            "docs_needed": True,
            "doc_status": "complete",  # Skip doc collection for demo
            "doc_request_count": doc_request_count + 1,
            "current_phase": "UNDERWRITING",
            "current_node": "underwriting_node",
        }
        log_agent_execution(application_id, "loan_review_node", "LOAN_REVIEW", state, output, "proceed", started_at=started_at)
        return preserve_state(state, output)


def underwriting_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 5: Run underwriting checklist and review."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")
    simulation_type = state.get("simulation_type")

    # Update status in database at start of node
    update_application_status(application_id, "UNDERWRITING", "underwriting_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "underwriting_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="underwriting_node")
        output = create_in_progress_state(state, "UNDERWRITING", "underwriting_node", stop_point[2])
        log_agent_execution(application_id, "underwriting_node", "UNDERWRITING", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})
    loan_amount = state.get("loan_amount", 0)

    uw_service = MockUnderwritingService()

    # Run checklist
    checklist_request = {"loan_amount": loan_amount, "customer_name": customer_profile.get("name", "")}
    checklist = uw_service.run_checklist(
        application_id=application_id,
        loan_amount=loan_amount,
        customer_name=customer_profile.get("name", ""),
    )
    log_api_call(application_id, "UnderwritingService", "/run-checklist", "POST", checklist_request, checklist)

    # Assign underwriter
    assignment = uw_service.assign_underwriter(
        application_id=application_id,
        loan_amount=loan_amount,
    )
    log_api_call(application_id, "UnderwritingService", "/assign-underwriter", "POST", {"loan_amount": loan_amount}, assignment)

    # Review completeness
    review = uw_service.review_completeness(
        application_id=application_id,
        checklist_id="checklist_1",
    )
    log_api_call(application_id, "UnderwritingService", "/review-completeness", "POST", {"checklist_id": "checklist_1"}, review)

    log_transaction(application_id, "STATE_CHANGE", "Underwriting", f"Ready: {review.get('is_ready')}", source_agent="underwriting_node")

    output = {
        "uw_checklist_complete": checklist.get("all_passed", False),
        "uw_assigned_to": assignment.get("underwriter", {}).get("name"),
        "uw_readiness": "ready" if review.get("is_ready") else "not_ready",
        "current_phase": "HUMAN_DECISION",
        "current_node": "human_decision_node",
    }
    log_agent_execution(application_id, "underwriting_node", "UNDERWRITING", state, output, "ready", started_at=started_at)
    return preserve_state(state, output)


def human_decision_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Human decision point - simulated for demo."""
    import random
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")
    simulation_type = state.get("simulation_type")

    # Update status in database at start of node
    update_application_status(application_id, "HUMAN_DECISION", "human_decision_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "human_decision_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="human_decision_node")
        output = create_in_progress_state(state, "HUMAN_DECISION", "human_decision_node", stop_point[2])
        log_agent_execution(application_id, "human_decision_node", "UNDERWRITING", state, output, "in_progress", started_at=started_at)
        return output

    # Determine decision based on simulation type
    if simulation_type == "denied":
        decision = "no"  # Force denial path
    elif simulation_type == "loan_closed":
        decision = "yes"  # Force approval path to loan closed
    elif simulation_type == "in_progress":
        decision = "yes"  # Will be stopped at a later point
    else:
        # Default: Simulate 80% approval rate
        decision = "yes" if random.random() > 0.2 else "no"

    log_transaction(application_id, "HUMAN_INPUT", "UW Decision", f"Decision: {decision}", source_agent="human_decision_node")

    if decision == "yes":
        output = {
            "uw_decision": "yes",
            "uw_decision_at": datetime.utcnow().isoformat(),
            "current_phase": "COMMITMENT",
            "current_node": "commitment_node",
        }
        log_agent_execution(application_id, "human_decision_node", "UNDERWRITING", state, output, "approved", started_at=started_at)
        return preserve_state(state, output)
    else:
        output = {
            "uw_decision": "no",
            "uw_decision_at": datetime.utcnow().isoformat(),
            "current_phase": "DENIAL",
            "current_node": "denial_node",
        }
        log_agent_execution(application_id, "human_decision_node", "UNDERWRITING", state, output, "denied", started_at=started_at)
        return preserve_state(state, output)


def commitment_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 6b: Create commitment letter."""
    import random
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")
    simulation_type = state.get("simulation_type")

    # Update status in database at start of node
    update_application_status(application_id, "COMMITMENT", "commitment_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "commitment_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="commitment_node")
        output = create_in_progress_state(state, "COMMITMENT", "commitment_node", stop_point[2])
        log_agent_execution(application_id, "commitment_node", "COMMITMENT", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})
    loan_amount = state.get("loan_amount", 0)

    doc_service = MockDocumentService()

    interest_rate = round(random.uniform(0.045, 0.075), 4)
    request_data = {
        "customer_name": customer_profile.get("name", ""),
        "loan_amount": loan_amount,
        "interest_rate": interest_rate,
    }
    letter = doc_service.create_commitment_letter(
        application_id=application_id,
        customer_name=customer_profile.get("name", ""),
        loan_amount=loan_amount,
        interest_rate=interest_rate,
        terms={"term_years": 30},
    )
    log_api_call(application_id, "DocumentService", "/commitment-letter", "POST", request_data, letter)

    log_transaction(application_id, "STATE_CHANGE", "Commitment", "Commitment letter created", source_agent="commitment_node")

    output = {
        "commitment_letter": {
            "document_id": letter.get("letter_id"),
            "terms": {"interest_rate": interest_rate},
        },
        "current_phase": "CLOSING",
        "current_node": "closing_node",
    }
    log_agent_execution(application_id, "commitment_node", "COMMITMENT", state, output, "created", started_at=started_at)
    return preserve_state(state, output)


def denial_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 6a: Create denial letter."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "DENIAL", "denial_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    customer_profile = state.get("customer_profile", {})

    doc_service = MockDocumentService()
    uw_service = MockUnderwritingService()

    reasons = uw_service.get_denial_reasons(application_id)
    log_api_call(application_id, "UnderwritingService", "/denial-reasons", "GET", {
        "application_id": application_id,
        "reason_type": "standard",
        "include_regulatory_codes": True,
    }, reasons)

    request_data = {
        "customer_name": customer_profile.get("name", ""),
        "denial_reasons": reasons.get("reasons", []),
    }
    letter = doc_service.create_denial_letter(
        application_id=application_id,
        customer_name=customer_profile.get("name", ""),
        denial_reasons=reasons.get("reasons", []),
    )
    log_api_call(application_id, "DocumentService", "/denial-letter", "POST", request_data, letter)

    log_transaction(application_id, "STATE_CHANGE", "Denial", "Denial letter created", source_agent="denial_node")

    # Update status to DENIED when denial is complete
    update_application_status(application_id, "DENIAL", "denial_node", "DENIED")

    output = {
        "denial_letter": {"document_id": letter.get("letter_id")},
        "current_phase": "DENIAL",
        "current_node": "denial_node",
        "workflow_status": "completed",
        "end_state": "denied",
    }
    log_agent_execution(application_id, "denial_node", "DENIAL", state, output, "denied", started_at=started_at)
    return preserve_state(state, output)


def closing_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 7: Create closing packet."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "CLOSING", "closing_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "closing_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="closing_node")
        output = create_in_progress_state(state, "CLOSING", "closing_node", stop_point[2])
        log_agent_execution(application_id, "closing_node", "CLOSING", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})
    property_address = state.get("property_address", "")
    loan_amount = state.get("loan_amount", 0)

    doc_service = MockDocumentService()
    title_agency = MockTitleAgencyAPI()

    # Create closing packet
    packet_request = {
        "customer_name": customer_profile.get("name", ""),
        "loan_amount": loan_amount,
        "property_address": property_address,
    }
    packet = doc_service.create_closing_packet(
        application_id=application_id,
        customer_name=customer_profile.get("name", ""),
        loan_amount=loan_amount,
        property_address=property_address,
    )
    log_api_call(application_id, "DocumentService", "/closing-packet", "POST", packet_request, packet)

    # Assign title agency
    agency = title_agency.assign_title_agency(
        application_id=application_id,
        property_address=property_address,
    )
    log_api_call(application_id, "TitleAgencyAPI", "/assign", "POST", {"property_address": property_address}, agency)

    log_transaction(application_id, "STATE_CHANGE", "Closing", "Closing packet created", source_agent="closing_node")

    output = {
        "closing_packet": {
            "packet_id": packet.get("packet_id"),
            "title_agency": agency.get("title_agency", {}),
            "closing_date": agency.get("scheduled_closing_date"),
        },
        "current_phase": "POST_CLOSING",
        "current_node": "maintenance_node",
    }
    log_agent_execution(application_id, "closing_node", "CLOSING", state, output, "created", started_at=started_at)
    return preserve_state(state, output)


def maintenance_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Phase 8: Complete MSP maintenance."""
    started_at = datetime.utcnow()
    application_id = state.get("application_id", "")

    # Update status in database at start of node
    update_application_status(application_id, "POST_CLOSING", "maintenance_node", "IN_PROGRESS")
    time.sleep(2)  # Allow UI to show status update

    # Check if this is an in-progress simulation stop point
    if should_stop_at_node(state, "maintenance_node"):
        stop_point = state.get("_in_progress_stop_point")
        log_transaction(application_id, "SIMULATION", "In-Progress Stop", f"Stopped at: {stop_point[2]}", source_agent="maintenance_node")
        output = create_in_progress_state(state, "POST_CLOSING", "maintenance_node", stop_point[2])
        log_agent_execution(application_id, "maintenance_node", "POST_CLOSING", state, output, "in_progress", started_at=started_at)
        return output

    customer_profile = state.get("customer_profile", {})

    msp_service = MockMSPService()

    # Start maintenance
    start_result = msp_service.start_maintenance(
        application_id=application_id,
        loan_number=f"LN-{application_id}",
        new_borrower_info=customer_profile,
    )
    log_api_call(application_id, "MSPService", "/start-maintenance", "POST", {"loan_number": f"LN-{application_id}"}, start_result)

    # Complete maintenance
    result = msp_service.complete_maintenance(
        application_id=application_id,
        maintenance_id=f"MSP_{application_id}",
    )
    log_api_call(application_id, "MSPService", "/complete-maintenance", "POST", {"maintenance_id": f"MSP_{application_id}"}, result)

    log_transaction(application_id, "DECISION", "Loan Closed", "Loan assumption complete", source_agent="maintenance_node")

    output = {
        "msp_status": "complete",
        "msp_completed_at": datetime.utcnow().isoformat(),
        "current_phase": "POST_CLOSING",
        "current_node": "end",
        "workflow_status": "completed",
        "end_state": "loan_closed",
    }
    log_agent_execution(application_id, "maintenance_node", "POST_CLOSING", state, output, "completed", started_at=started_at)
    return preserve_state(state, output)


def route_after_intake(state: Dict[str, Any]) -> str:
    """Route after intake based on eligibility."""
    if state.get("workflow_status") == "paused":
        return END
    if state.get("eligibility_status") == "ineligible":
        return END
    return "application_node"


def route_after_application(state: Dict[str, Any]) -> str:
    """Route after application."""
    if state.get("workflow_status") == "paused":
        return END
    if state.get("end_state"):
        return END
    return "disclosure_node"


def route_after_disclosure(state: Dict[str, Any]) -> str:
    """Route after disclosure."""
    if state.get("workflow_status") == "paused":
        return END
    return "loan_review_node"


def route_after_loan_review(state: Dict[str, Any]) -> str:
    """Route after loan review."""
    if state.get("workflow_status") == "paused":
        return END
    if state.get("end_state"):
        return END
    return "underwriting_node"


def route_after_underwriting(state: Dict[str, Any]) -> str:
    """Route after underwriting."""
    if state.get("workflow_status") == "paused":
        return END
    return "human_decision_node"


def route_after_human_decision(state: Dict[str, Any]) -> str:
    """Route after human decision."""
    if state.get("workflow_status") == "paused":
        return END
    if state.get("uw_decision") == "yes":
        return "commitment_node"
    return "denial_node"


def route_after_denial(state: Dict[str, Any]) -> str:
    """End after denial."""
    return END


def route_after_commitment(state: Dict[str, Any]) -> str:
    """Route to closing after commitment, or end if workflow is paused."""
    if state.get("workflow_status") == "paused":
        return END
    return "closing_node"


def route_after_closing(state: Dict[str, Any]) -> str:
    """Route to maintenance after closing."""
    return "maintenance_node"


def route_after_maintenance(state: Dict[str, Any]) -> str:
    """End after maintenance."""
    return END


def create_loan_workflow(db: Optional[Session] = None) -> StateGraph:
    """Create the loan workflow graph."""

    # Build the graph
    builder = StateGraph(dict)

    # Add nodes
    builder.add_node("intake_node", intake_node)
    builder.add_node("application_node", application_node)
    builder.add_node("disclosure_node", disclosure_node)
    builder.add_node("loan_review_node", loan_review_node)
    builder.add_node("underwriting_node", underwriting_node)
    builder.add_node("human_decision_node", human_decision_node)
    builder.add_node("commitment_node", commitment_node)
    builder.add_node("denial_node", denial_node)
    builder.add_node("closing_node", closing_node)
    builder.add_node("maintenance_node", maintenance_node)

    # Set entry point
    builder.set_entry_point("intake_node")

    # Add conditional edges
    builder.add_conditional_edges("intake_node", route_after_intake)
    builder.add_conditional_edges("application_node", route_after_application)
    builder.add_conditional_edges("disclosure_node", route_after_disclosure)
    builder.add_conditional_edges("loan_review_node", route_after_loan_review)
    builder.add_conditional_edges("underwriting_node", route_after_underwriting)
    builder.add_conditional_edges("human_decision_node", route_after_human_decision)
    builder.add_conditional_edges("commitment_node", route_after_commitment)
    builder.add_conditional_edges("denial_node", route_after_denial)
    builder.add_conditional_edges("closing_node", route_after_closing)
    builder.add_conditional_edges("maintenance_node", route_after_maintenance)

    return builder.compile()


class LoanWorkflow:
    """Workflow orchestrator."""

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.graph = create_loan_workflow(db)

    def start(self, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new workflow."""
        application_id = initial_state.get("application_id")
        simulation_type = initial_state.get("simulation_type")

        # For in-progress simulation, select a random stop point
        if simulation_type == "in_progress":
            stop_point = get_random_stop_point()
            initial_state["_in_progress_stop_point"] = stop_point
            log_transaction(
                application_id,
                "SIMULATION",
                "In-Progress Simulation",
                f"Will stop at: {stop_point[0]} - {stop_point[2]}",
                data={"stop_phase": stop_point[0], "stop_node": stop_point[1], "stop_task": stop_point[2]}
            )

        # Create database record
        if self.db:
            app = LoanApplication(
                application_id=application_id,
                customer_name=initial_state.get("customer_profile", {}).get("name"),
                customer_email=initial_state.get("customer_profile", {}).get("email"),
                customer_phone=initial_state.get("customer_profile", {}).get("phone"),
                property_address=initial_state.get("property_address"),
                loan_amount=initial_state.get("loan_amount"),
                original_borrower=initial_state.get("original_borrower"),
                current_phase="INTAKE",
                current_node="START",
                status="IN_PROGRESS",
            )
            self.db.add(app)
            self.db.commit()

        # Log workflow start
        log_transaction(application_id, "WORKFLOW_START", "Workflow Started", "Loan assumption workflow initiated")

        # Run the workflow
        result = self.graph.invoke(initial_state)

        # Update database
        if self.db:
            app = self.db.query(LoanApplication).filter_by(application_id=application_id).first()
            if app:
                app.current_phase = result.get("current_phase", "UNKNOWN")
                app.current_node = result.get("current_node", "UNKNOWN")
                app.end_state = result.get("end_state")
                if result.get("workflow_status") == "completed":
                    # Set status based on end_state
                    end_state = result.get("end_state", "")
                    if end_state == "denied" or result.get("current_phase") == "DENIAL":
                        app.status = "DENIED"
                        app.completed_at = datetime.utcnow()
                    elif end_state == "loan_closed":
                        # Only mark as COMPLETED when loan is successfully closed
                        app.status = "COMPLETED"
                        app.completed_at = datetime.utcnow()
                    # For other end states (ineligible, incomplete, withdrawn), keep as IN_PROGRESS

                # Save workflow state to workflow_states table
                # This is critical for in-progress simulation tracking
                state_to_save = {k: v for k, v in result.items() if not k.startswith('_')}
                workflow_state = WorkflowState(
                    application_id=application_id,
                    state_json=state_to_save,
                    checkpoint_name=f"workflow_{result.get('workflow_status', 'unknown')}",
                    phase=result.get("current_phase", "UNKNOWN"),
                )
                self.db.add(workflow_state)
                self.db.commit()

        # Log workflow end
        log_transaction(
            application_id,
            "WORKFLOW_END",
            "Workflow Completed" if result.get("workflow_status") == "completed" else "Workflow Paused",
            f"Workflow ended with state: {result.get('end_state', result.get('workflow_status', 'unknown'))}",
            data={"end_state": result.get("end_state"), "current_phase": result.get("current_phase"), "workflow_status": result.get("workflow_status")}
        )

        return result
