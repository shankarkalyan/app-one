"""Base class for mock APIs."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session


class MockAPIBase:
    """Base class with common mock API functionality."""

    def __init__(self, db: Optional[Session] = None, fail_rate: float = 0.0):
        """
        Initialize mock API.

        Args:
            db: Optional database session for logging API calls
            fail_rate: Probability of simulating a failure (0.0 to 1.0)
        """
        self.db = db
        self.fail_rate = fail_rate

    def _generate_id(self, prefix: str = "") -> str:
        """Generate a unique ID."""
        return f"{prefix}{uuid.uuid4().hex[:12]}"

    def _timestamp(self) -> str:
        """Get current timestamp as ISO string."""
        return datetime.utcnow().isoformat()

    def _should_fail(self) -> bool:
        """Determine if this call should simulate a failure."""
        return random.random() < self.fail_rate

    def _simulate_delay(self) -> int:
        """Simulate API call duration in milliseconds."""
        return random.randint(50, 500)

    def _log_call(
        self,
        application_id: str,
        api_name: str,
        endpoint: str,
        method: str,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any],
        status_code: int,
    ):
        """Log API call to database if session available."""
        if self.db:
            try:
                from database.models import MockAPICall
                from database.connection import SessionLocal

                # Use a separate session for logging to avoid conflicts
                log_session = SessionLocal()
                try:
                    call = MockAPICall(
                        application_id=application_id,
                        api_name=api_name,
                        endpoint=endpoint,
                        method=method,
                        request_data=request_data,
                        response_data=response_data,
                        status_code=status_code,
                        duration_ms=self._simulate_delay(),
                    )
                    log_session.add(call)
                    log_session.commit()
                finally:
                    log_session.close()
            except Exception as e:
                print(f"Warning: Failed to log API call: {e}")
