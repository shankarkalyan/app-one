"""Mock APIs for external services."""
from .docusign import MockDocuSignAPI
from .case_optimizer import MockCaseOptimizerAPI
from .eligibility import MockEligibilityAPI
from .document_service import MockDocumentService
from .notification_service import MockNotificationService
from .underwriting import MockUnderwritingService
from .title_agency import MockTitleAgencyAPI
from .msp_service import MockMSPService

__all__ = [
    "MockDocuSignAPI",
    "MockCaseOptimizerAPI",
    "MockEligibilityAPI",
    "MockDocumentService",
    "MockNotificationService",
    "MockUnderwritingService",
    "MockTitleAgencyAPI",
    "MockMSPService",
]
