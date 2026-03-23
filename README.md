# Loan Assumption Workflow - Agentic System

A complete agentic loan assumption workflow system built with LangGraph, FastAPI, SQLite, and React.

## Architecture Overview

This system implements a multi-agent workflow for processing loan assumptions with:

- **10 Specialized Agents** - Each handling specific phases of the loan process
- **Supervisor Pattern** - Conditional routing between agents
- **SQ Review Node** - Reusable quality checkpoint (7 checkpoints)
- **Human-in-the-Loop** - Decision points requiring human input
- **Full Transaction Logging** - Complete audit trail of all operations

### Workflow Phases

1. **Intake** - Verify caller identity and check eligibility
2. **Application** - Send application via DocuSign, track SLA
3. **Disclosure** - Create and send disclosure package
4. **Loan Review** - Document collection and verification
5. **Underwriting** - Checklist and review for completeness
6. **Denial/Commitment** - Based on underwriting decision
7. **Closing** - Create closing packet, send to title agency
8. **Post-Closing** - Review and MSP maintenance

### End States

- **Loan Closed** - Successful completion
- **Ineligible** - Loan not eligible for assumption
- **Incomplete** - Application not completed within SLA
- **Withdrawn** - Customer didn't return documents
- **Denied** - Underwriting decision was "No"

## Project Structure

```
hlt-assumptions-app/
├── backend/
│   ├── agents/           # All agent implementations
│   │   ├── base.py              # Base agent class
│   │   ├── intake_agent.py      # Phase 1
│   │   ├── application_agent.py # Phase 2
│   │   ├── disclosure_agent.py  # Phase 3
│   │   ├── loan_review_agent.py # Phase 4
│   │   ├── doc_letter_agent.py  # Phase 4
│   │   ├── underwriting_agent.py# Phase 5
│   │   ├── commitment_agent.py  # Phase 6b
│   │   ├── denial_agent.py      # Phase 6a
│   │   ├── closing_packet_agent.py # Phase 7
│   │   ├── maintenance_agent.py # Phase 8
│   │   ├── notify_agent.py      # Notifications
│   │   ├── call_agent.py        # Call assignment
│   │   ├── review_agent.py      # Customer review
│   │   └── sq_review_node.py    # Quality review
│   ├── database/         # SQLite models and connection
│   │   ├── models.py            # Database models
│   │   └── connection.py        # DB connection
│   ├── mock_apis/        # Mock external services
│   │   ├── docusign.py          # DocuSign API
│   │   ├── case_optimizer.py    # Caller verification
│   │   ├── eligibility.py       # Eligibility check
│   │   ├── document_service.py  # Document generation
│   │   ├── notification_service.py # Notifications
│   │   ├── underwriting.py      # Underwriting service
│   │   ├── title_agency.py      # Title agency
│   │   └── msp_service.py       # MSP maintenance
│   ├── models/           # Pydantic models and state
│   │   ├── state.py             # LangGraph state
│   │   └── api_models.py        # API models
│   ├── workflow/         # LangGraph workflow
│   │   └── graph.py             # Main workflow graph
│   ├── main.py           # FastAPI application
│   ├── seed_data.py      # Database seeding
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   │   └── WorkflowGraph.jsx # Workflow visualization
│   │   ├── pages/        # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ApplicationList.jsx
│   │   │   ├── ApplicationDetail.jsx
│   │   │   └── NewApplication.jsx
│   │   ├── services/     # API services
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── workflow/
│   └── agentic-loan-langgraph.html # Original design document
├── run_backend.sh        # Backend run script
├── run_frontend.sh       # Frontend run script
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm

---

## Database Setup (Required for Fresh Checkout)

### Step 1: Navigate to backend folder
```bash
cd backend
```

### Step 2: Create and activate virtual environment
```bash
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows
```

### Step 3: Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Initialize the database (creates all tables)
```bash
python3 -c "from database.connection import init_db; init_db()"
```

### Step 5: Run database migrations (in order)
```bash
python3 migrate_db.py
python3 migrate_specialty_types.py
python3 migrate_dual_phase.py
python3 migrate_workflow_definitions.py
python3 migrate_sla.py
```

### Step 6: Seed initial data
```bash
python3 seed_specialists.py        # Creates admin and specialist users
python3 seed_complete_workflow.py  # Creates workflow tasks, subtasks, checklist items
```

---

## Running the Application

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the server
python -m uvicorn main:app --reload --port 8000
```

Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

Or use the run script:
```bash
chmod +x run_backend.sh
./run_backend.sh
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend: http://localhost:5173

Or use the run script:
```bash
chmod +x run_frontend.sh
./run_frontend.sh
```

---

## Default Login Credentials

| Role       | Username              | Password       |
|------------|-----------------------|----------------|
| Admin      | admin                 | admin123       |
| Specialist | intake_specialist     | specialist123  |
| Specialist | app_specialist        | specialist123  |
| Specialist | disclosure_specialist | specialist123  |
| Specialist | loan_review_specialist| specialist123  |
| Specialist | underwriter           | specialist123  |

---

## Data Management

### Flush All Data
The "Flush All" button in the Admin Dashboard will:
- Delete all loan applications and related data
- Clear allocation history (Analytics & History tabs)
- Reset all specialist phase allocations to unallocated

### Reset Database Completely
```bash
cd backend
rm loan_workflow.db
python3 -c "from database.connection import init_db; init_db()"
# Then run migrations and seed scripts again (Steps 5-6)
```

---

## Admin Dashboard Features

- **Overview**: System statistics and metrics
- **Analytics**: D3 charts for network graph, workload, and flow diagrams
- **Specialist Phase Allocation**: Drag-and-drop specialist assignment to workflow phases
- **Workflow Config**: Configure workflow tasks, subtasks, and checklist items

## API Endpoints

### Applications

- `POST /api/applications` - Create new loan application
- `GET /api/applications` - List all applications
- `GET /api/applications/{id}` - Get application details
- `GET /api/applications/{id}/graph` - Get workflow graph

### Workflow

- `GET /api/applications/{id}/executions` - Get agent executions
- `GET /api/applications/{id}/transactions` - Get transaction logs
- `GET /api/applications/{id}/api-calls` - Get mock API calls

### Human Tasks

- `GET /api/applications/{id}/human-tasks` - Get pending tasks
- `POST /api/applications/{id}/human-tasks/{task_id}/complete` - Complete task

### Simulation

- `POST /api/applications/{id}/simulate-document-return` - Simulate docs received

## Frontend Features

### Dashboard
- Overview of all applications
- Status statistics
- Quick links to recent applications

### Application List
- Filterable and paginated list
- Status indicators
- Quick actions

### Application Detail
- **Workflow Graph** - Visual representation of agent nodes with status
- **Agent Executions** - Detailed log of each agent run
- **Transaction Log** - Complete audit trail
- **API Calls** - All mock API interactions
- **Human Task Handling** - Approve/deny pending decisions

## LangGraph Design Patterns

1. **Supervisor Pattern** - Conditional edge routing based on state
2. **Reusable Subgraph** - SQ Review Node used at 7 checkpoints
3. **Human-in-the-Loop** - Interrupt and resume for decisions
4. **Command Pattern** - Dynamic routing with state updates
5. **Shared State** - TypedDict with annotated reducers

## Database Schema

### Tables

- **loan_applications** - Main application record
- **workflow_states** - State snapshots at checkpoints
- **agent_executions** - Record of each agent run
- **transaction_logs** - Audit trail of all events
- **human_tasks** - Tasks requiring human input
- **mock_api_calls** - Log of all mock API calls

## Configuration

### Environment Variables

- `DATABASE_PATH` - SQLite database file path (default: `loan_workflow.db`)

## Mock Services

All external services are mocked:

- **DocuSign** - Document signing
- **Case Optimizer** - Caller verification Q&A
- **Eligibility Service** - Loan eligibility check
- **Document Service** - Document generation
- **Notification Service** - Email/SMS notifications
- **Underwriting Service** - Checklist and assignment
- **Title Agency** - Closing coordination
- **MSP Service** - System maintenance

## License

MIT License
