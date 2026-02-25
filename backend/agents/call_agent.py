"""Call Agent - Phase 6b: Assign to Call Agent."""
from typing import Dict, Any
from datetime import datetime
import random
from langgraph.types import Command

from .base import BaseAgent


class CallAgent(BaseAgent):
    """
    Phase 6b: Call Agent

    Responsibilities:
    - Assign call agent to application
    - Facilitate customer communication
    """

    CALL_AGENTS = [
        {"id": "CA001", "name": "Alice Thompson", "team": "Customer Relations"},
        {"id": "CA002", "name": "Bob Martinez", "team": "Customer Relations"},
        {"id": "CA003", "name": "Carol Wilson", "team": "Senior Support"},
        {"id": "CA004", "name": "David Lee", "team": "Senior Support"},
    ]

    def __init__(self, db=None):
        super().__init__(db)
        self.phase = "COMMITMENT"

    def execute(self, state: Dict[str, Any]) -> Command:
        """
        Execute call agent assignment:
        1. Assign call agent
        2. Route to Review Agent
        """
        application_id = state.get("application_id")
        loan_amount = state.get("loan_amount", 0)

        updates = {
            "current_phase": "COMMITMENT",
            "current_node": self.name,
        }

        # Assign call agent based on loan amount
        if loan_amount > 500000:
            eligible = [ca for ca in self.CALL_AGENTS if ca["team"] == "Senior Support"]
        else:
            eligible = self.CALL_AGENTS

        assigned_agent = random.choice(eligible)

        updates["call_agent_assigned"] = assigned_agent["name"]

        self._log_transaction(
            application_id=application_id,
            event_type="STATE_CHANGE",
            event_name="Call Agent Assigned",
            description=f"Assigned to {assigned_agent['name']} ({assigned_agent['team']})",
            data=assigned_agent,
        )

        msg_updates = self._add_message(
            state,
            f"Call agent {assigned_agent['name']} assigned for application {application_id}. Routing to review with customer.",
        )
        updates.update(msg_updates)
        updates = self._update_timestamps(updates)

        return Command(
            update=updates,
            goto="review_agent",
        )
