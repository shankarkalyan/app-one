"""Base agent class for all loan workflow agents."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from langgraph.types import Command


class BaseAgent(ABC):
    """
    Base class for all agents in the loan workflow.

    Each agent:
    1. Reads from the shared state
    2. Performs its specific task (often calling mock APIs)
    3. Updates state and returns a Command with routing decision
    """

    def __init__(self, db: Optional[Session] = None):
        """
        Initialize the agent.

        Args:
            db: Optional database session for logging
        """
        self.db = db
        self.name = self.__class__.__name__
        self.agent_type = "AGENT"  # Override in subclasses as needed
        self.phase = ""  # Override in subclasses

    def _log_execution(
        self,
        application_id: str,
        input_state: Dict[str, Any],
        output_state: Dict[str, Any],
        decision: str,
        status: str = "COMPLETED",
        error_message: Optional[str] = None,
        started_at: Optional[datetime] = None,
    ):
        """Log agent execution to database."""
        if self.db:
            try:
                from database.models import AgentExecution
                from database.connection import SessionLocal

                # Use a separate session for logging to avoid conflicts
                log_session = SessionLocal()
                try:
                    now = datetime.utcnow()
                    execution = AgentExecution(
                        application_id=application_id,
                        agent_name=self.name,
                        agent_type=self.agent_type,
                        phase=self.phase,
                        input_state=self._summarize_state(input_state),
                        output_state=self._summarize_state(output_state),
                        decision=decision,
                        status=status,
                        error_message=error_message,
                        started_at=started_at or now,
                        completed_at=now,
                        duration_ms=int((now - (started_at or now)).total_seconds() * 1000) if started_at else 0,
                    )
                    log_session.add(execution)
                    log_session.commit()
                finally:
                    log_session.close()
            except Exception as e:
                print(f"Warning: Failed to log execution: {e}")

    def _log_transaction(
        self,
        application_id: str,
        event_type: str,
        event_name: str,
        description: str,
        data: Optional[Dict[str, Any]] = None,
        previous_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
    ):
        """Log a transaction event to database."""
        if self.db:
            try:
                from database.models import TransactionLog
                from database.connection import SessionLocal

                # Use a separate session for logging to avoid conflicts
                log_session = SessionLocal()
                try:
                    log = TransactionLog(
                        application_id=application_id,
                        event_type=event_type,
                        event_name=event_name,
                        description=description,
                        data=data,
                        previous_value={"value": previous_value} if previous_value is not None else None,
                        new_value={"value": new_value} if new_value is not None else None,
                        source_agent=self.name,
                        source_node=self.name,
                    )
                    log_session.add(log)
                    log_session.commit()
                finally:
                    log_session.close()
            except Exception as e:
                print(f"Warning: Failed to log transaction: {e}")

    def _summarize_state(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of state for logging (avoid storing huge message lists)."""
        summary = {}
        skip_keys = {"messages"}  # Skip large fields

        for key, value in state.items():
            if key in skip_keys:
                summary[key] = f"[{len(value) if isinstance(value, list) else 1} items]"
            elif isinstance(value, dict) and len(str(value)) > 500:
                summary[key] = f"[dict with {len(value)} keys]"
            else:
                summary[key] = value

        return summary

    def _update_timestamps(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Update the updated_at timestamp."""
        state["updated_at"] = datetime.utcnow().isoformat()
        return state

    def _add_message(
        self,
        state: Dict[str, Any],
        content: str,
        role: str = "assistant",
    ) -> Dict[str, Any]:
        """Add a message to the state's message history."""
        message = {
            "role": role,
            "content": content,
            "agent": self.name,
            "timestamp": datetime.utcnow().isoformat(),
        }

        if "messages" not in state:
            state["messages"] = []

        # Return new messages to be appended (reducer will handle)
        return {"messages": [message]}

    def _add_error(
        self,
        state: Dict[str, Any],
        error: str,
    ) -> Dict[str, Any]:
        """Add an error to the state."""
        error_entry = {
            "error": error,
            "agent": self.name,
            "timestamp": datetime.utcnow().isoformat(),
        }

        if "errors" not in state:
            state["errors"] = []

        state["errors"].append(error_entry)
        state["last_error"] = error

        return state

    @abstractmethod
    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute the agent's task.

        Args:
            state: Current workflow state

        Returns:
            Command with state updates and goto destination
        """
        pass

    def __call__(self, state: Dict[str, Any]) -> Command:
        """Make the agent callable for LangGraph."""
        started_at = datetime.utcnow()

        try:
            # Update current node tracking
            state["previous_node"] = state.get("current_node")
            state["current_node"] = self.name

            # Log start
            self._log_transaction(
                application_id=state.get("application_id", "unknown"),
                event_type="AGENT_START",
                event_name=f"{self.name} Started",
                description=f"Agent {self.name} started execution in phase {self.phase}",
                data={"phase": self.phase, "previous_node": state.get("previous_node")},
            )

            # Execute agent logic
            result = self.execute(state)

            # Log completion
            self._log_execution(
                application_id=state.get("application_id", "unknown"),
                input_state=state,
                output_state=result.update if hasattr(result, "update") else {},
                decision=str(result.goto) if hasattr(result, "goto") else "unknown",
                status="COMPLETED",
                started_at=started_at,
            )

            return result

        except Exception as e:
            # Log error
            self._log_execution(
                application_id=state.get("application_id", "unknown"),
                input_state=state,
                output_state={},
                decision="ERROR",
                status="FAILED",
                error_message=str(e),
                started_at=started_at,
            )

            # Add error to state and continue to error handling
            error_state = self._add_error(state.copy(), str(e))
            error_state = self._update_timestamps(error_state)

            return Command(
                update=error_state,
                goto="error_handler",
            )
