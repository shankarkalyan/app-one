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
