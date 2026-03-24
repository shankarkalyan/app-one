# HLT Assumptions App - Database Schema Documentation

## Overview

This document describes the database schema for the HLT Loan Assumption Workflow application. The application currently uses **SQLite** for development, but this guide provides instructions for migrating to **PostgreSQL** for production use.

---

## Database Recommendation

| Environment | Recommended Database | Reason |
|-------------|---------------------|--------|
| Development | SQLite | Simple setup, no server required |
| Production | **PostgreSQL** | ACID compliance, scalability, JSON support, concurrent connections |
| Alternative | MySQL/MariaDB | Good alternative if PostgreSQL not available |

**Why PostgreSQL?**
- Native JSON/JSONB support (used for `state_json`, `completion_data`, etc.)
- Better concurrent write handling for workflow operations
- Advanced indexing options
- Strong transaction support for financial applications

---

## Entity Relationship Diagram

### Diagram Legend
```
┌─────────────┐
│ TABLE_NAME  │     PK = Primary Key      1 ──────── * = One-to-Many
├─────────────┤     FK = Foreign Key      1 ──────── 1 = One-to-One
│ PK column   │     UK = Unique Key
│ FK column   │
└─────────────┘
```

---

### 1. CORE APPLICATION TABLES

```
                                    ┌─────────────────────────┐
                                    │    LOAN_APPLICATIONS    │
                                    ├─────────────────────────┤
                                    │ PK  id                  │
                                    │ UK  application_id      │
                                    │     customer_name       │
                                    │     customer_email      │
                                    │     loan_amount         │
                                    │     current_phase       │
                                    │     status              │
                                    └───────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 │                              │                              │
                 │ 1                          1 │ 1                          1 │
                 ▼ *                            ▼ *                            ▼ *
    ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
    │    WORKFLOW_STATES     │    │   AGENT_EXECUTIONS     │    │   TRANSACTION_LOGS     │
    ├────────────────────────┤    ├────────────────────────┤    ├────────────────────────┤
    │ PK  id                 │    │ PK  id                 │    │ PK  id                 │
    │ FK  application_id ────┼────│ FK  application_id ────┼────│ FK  application_id     │
    │     state_json (JSON)  │    │     agent_name         │    │     event_type         │
    │     checkpoint_name    │    │     status             │    │     data (JSON)        │
    │     phase              │    │     input_state (JSON) │    │     timestamp          │
    └────────────────────────┘    └────────────────────────┘    └────────────────────────┘

                                                │
                                              1 │
                                                ▼ *
                                   ┌────────────────────────┐
                                   │      HUMAN_TASKS       │
                                   ├────────────────────────┤
                                   │ PK  id                 │
                                   │ FK  application_id     │
                                   │     task_type          │
                                   │     status             │
                                   │     decision           │
                                   └────────────────────────┘
```

---

### 2. SPECIALIST & TASK MANAGEMENT TABLES

```
    ┌────────────────────────┐
    │      SPECIALISTS       │
    ├────────────────────────┤
    │ PK  id                 │
    │ UK  username           │
    │     full_name          │
    │     specialty_types    │
    │     role               │
    └───────────┬────────────┘
                │
                │ 1
                ▼ *
    ┌────────────────────────┐         ┌────────────────────────┐
    │   SPECIALIST_TASKS     │         │    LOAN_APPLICATIONS   │
    ├────────────────────────┤         ├────────────────────────┤
    │ PK  id                 │    *    │ (from Core Tables)     │
    │ FK  specialist_id ─────┼─────────│                        │
    │ FK  application_id ────┼────── 1 │                        │
    │     phase              │         └────────────────────────┘
    │     task_title         │
    │     status             │
    │     due_date           │
    └───────────┬────────────┘
                │
                │ 1
                ▼ *
    ┌────────────────────────┐         ┌────────────────────────┐
    │     SUBTASK_NOTES      │         │      SPECIALISTS       │
    ├────────────────────────┤         ├────────────────────────┤
    │ PK  id                 │    *    │ (Author Reference)     │
    │ FK  task_id ───────────┼─────────│                        │
    │ FK  author_id ─────────┼────── 1 │                        │
    │     subtask_num        │         └────────────────────────┘
    │     note_text          │
    └────────────────────────┘
```

---

### 3. WORKFLOW CONFIGURATION TABLES

```
    ┌─────────────────────────────┐
    │  WORKFLOW_TASK_DEFINITIONS  │
    ├─────────────────────────────┤
    │ PK  id                      │
    │ UK  phase_code              │
    │     name                    │
    │     sla_hours               │
    │     order_index             │
    └─────────────┬───────────────┘
                  │
                  │ 1
                  ▼ *
    ┌─────────────────────────────┐
    │    SUBTASK_DEFINITIONS      │
    ├─────────────────────────────┤
    │ PK  id                      │
    │ FK  task_id                 │
    │ FK  default_specialist_id ──┼──────┐
    │     name                    │      │
    │     estimated_duration      │      │     ┌────────────────────────┐
    │     is_required             │      │     │      SPECIALISTS       │
    └─────────────┬───────────────┘      │  1  ├────────────────────────┤
                  │                      └─────│ (Optional Default)     │
                  │ 1                          └────────────────────────┘
                  ▼ *
    ┌─────────────────────────────┐
    │ CHECKLIST_ITEM_DEFINITIONS  │
    ├─────────────────────────────┤
    │ PK  id                      │
    │ FK  subtask_id              │
    │     name                    │
    │     activity_category       │
    │     is_required             │
    └─────────────────────────────┘
```

---

### 4. AUDIT & LOGGING TABLES

```
    ┌────────────────────────┐                    ┌────────────────────────┐
    │   ALLOCATION_HISTORY   │                    │     MOCK_API_CALLS     │
    ├────────────────────────┤                    ├────────────────────────┤
    │ PK  id                 │                    │ PK  id                 │
    │ FK  specialist_id ─────┼──┐                 │     application_id     │
    │ FK  task_id            │  │                 │     api_name           │
    │ FK  performed_by_id ───┼──┤                 │     request_data       │
    │     event_type         │  │                 │     response_data      │
    │     from_phase         │  │  ┌────────────┐ │     status_code        │
    │     to_phase           │  └──│ SPECIALISTS│ └────────────────────────┘
    │     reason             │     └────────────┘
    └────────────────────────┘
```

---

### 5. COMPLETE RELATIONSHIP SUMMARY

| Parent Table | Child Table | Relationship | Foreign Key |
|--------------|-------------|--------------|-------------|
| loan_applications | workflow_states | 1 : Many | application_id |
| loan_applications | agent_executions | 1 : Many | application_id |
| loan_applications | transaction_logs | 1 : Many | application_id |
| loan_applications | human_tasks | 1 : Many | application_id |
| loan_applications | specialist_tasks | 1 : Many | application_id |
| specialists | specialist_tasks | 1 : Many | specialist_id |
| specialists | subtask_notes | 1 : Many | author_id |
| specialist_tasks | subtask_notes | 1 : Many | task_id |
| workflow_task_definitions | subtask_definitions | 1 : Many | task_id |
| subtask_definitions | checklist_item_definitions | 1 : Many | subtask_id |
| specialists | allocation_history | 1 : Many | specialist_id |
| specialists | subtask_definitions | 1 : Many (optional) | default_specialist_id |

---

## Table Definitions

### 1. loan_applications (Core Application Data)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Internal ID |
| application_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | Business ID (e.g., LA-44E622CA) |
| customer_name | VARCHAR(200) | | Full name of borrower |
| customer_email | VARCHAR(200) | | Email address |
| customer_phone | VARCHAR(50) | | Phone number |
| ssn_last_four | VARCHAR(4) | | Last 4 digits of SSN |
| property_address | VARCHAR(500) | | Property address |
| loan_amount | FLOAT | | Loan amount in dollars |
| original_borrower | VARCHAR(200) | | Original loan holder name |
| current_phase | VARCHAR(50) | DEFAULT 'INTAKE' | Current workflow phase |
| current_node | VARCHAR(100) | | Current workflow node |
| status | VARCHAR(50) | DEFAULT 'PENDING' | PENDING, IN_PROGRESS, COMPLETED, FAILED |
| end_state | VARCHAR(50) | | INELIGIBLE, INCOMPLETE, WITHDRAWN, DENIED, LOAN_CLOSED |
| created_at | DATETIME | DEFAULT NOW() | Record creation time |
| updated_at | DATETIME | DEFAULT NOW(), ON UPDATE | Last modification time |
| completed_at | DATETIME | | Workflow completion time |

**Indexes:**
- `idx_application_id` on `application_id`
- `idx_status` on `status`
- `idx_current_phase` on `current_phase`

---

### 2. workflow_states (State Snapshots)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| application_id | VARCHAR(50) | FK → loan_applications | Reference to application |
| state_json | JSON | NOT NULL | Complete LangGraph state snapshot |
| checkpoint_name | VARCHAR(100) | | Checkpoint identifier |
| phase | VARCHAR(50) | | Phase at checkpoint |
| created_at | DATETIME | DEFAULT NOW() | Snapshot time |

---

### 3. agent_executions (Agent Run History)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| application_id | VARCHAR(50) | FK → loan_applications | Reference to application |
| agent_name | VARCHAR(100) | NOT NULL | Agent identifier |
| agent_type | VARCHAR(50) | | AGENT, SUPERVISOR, SQ_REVIEW, NOTIFY, HUMAN_IN_LOOP |
| phase | VARCHAR(50) | | Execution phase |
| input_state | JSON | | State before execution |
| output_state | JSON | | State after execution |
| decision | VARCHAR(100) | | Routing decision made |
| status | VARCHAR(50) | DEFAULT 'PENDING' | PENDING, RUNNING, COMPLETED, FAILED, WAITING_HUMAN |
| error_message | TEXT | | Error details if failed |
| started_at | DATETIME | DEFAULT NOW() | Execution start |
| completed_at | DATETIME | | Execution end |
| duration_ms | INTEGER | | Execution duration |

---

### 4. transaction_logs (Audit Trail)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| application_id | VARCHAR(50) | FK → loan_applications | Reference to application |
| event_type | VARCHAR(50) | NOT NULL | STATE_CHANGE, AGENT_START, AGENT_END, DECISION, ERROR, HUMAN_INPUT |
| event_name | VARCHAR(200) | | Event identifier |
| description | TEXT | | Human-readable description |
| data | JSON | | Event data |
| previous_value | JSON | | Value before change |
| new_value | JSON | | Value after change |
| source_agent | VARCHAR(100) | | Agent that triggered event |
| source_node | VARCHAR(100) | | Node that triggered event |
| timestamp | DATETIME | DEFAULT NOW() | Event time |

---

### 5. human_tasks (Human Intervention Queue)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| application_id | VARCHAR(50) | FK → loan_applications | Reference to application |
| task_type | VARCHAR(50) | NOT NULL | UNDERWRITING_DECISION, DENIAL_APPROVAL, SQ_ESCALATION |
| task_description | TEXT | | Task details |
| checkpoint | VARCHAR(100) | | Workflow checkpoint |
| context_data | JSON | | Data for human review |
| assigned_to | VARCHAR(200) | | Assigned user |
| response | JSON | | Human response data |
| decision | VARCHAR(50) | | YES, NO, APPROVE, REJECT |
| notes | TEXT | | Human notes |
| status | VARCHAR(50) | DEFAULT 'PENDING' | PENDING, ASSIGNED, IN_PROGRESS, COMPLETED |
| is_manual_update | BOOLEAN | DEFAULT FALSE | Manual override flag |
| manual_update_by | VARCHAR(200) | | Who performed manual update |
| manual_update_reason | TEXT | | Reason for manual update |
| created_at | DATETIME | DEFAULT NOW() | Task creation |
| assigned_at | DATETIME | | Assignment time |
| completed_at | DATETIME | | Completion time |

---

### 6. specialists (User Management)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| username | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Login username |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| full_name | VARCHAR(200) | NOT NULL | Display name |
| email | VARCHAR(200) | | Email address |
| specialty_type | VARCHAR(50) | | Legacy: single specialty |
| specialty_types | JSON | DEFAULT [] | List of specialties |
| dual_phase | BOOLEAN | DEFAULT FALSE | Works two phases simultaneously |
| dual_phases | JSON | DEFAULT [] | Dual phase assignments |
| role | VARCHAR(50) | DEFAULT 'specialist' | specialist, admin |
| is_active | BOOLEAN | DEFAULT TRUE | Account active flag |
| created_at | DATETIME | DEFAULT NOW() | Account creation |
| last_login_at | DATETIME | | Last login time |

**Specialty Types:**
- INTAKE
- APPLICATION
- DISCLOSURE
- LOAN_REVIEW
- UNDERWRITING
- COMMITMENT
- CLOSING
- POST_CLOSING

---

### 7. specialist_tasks (Task Assignment)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| application_id | VARCHAR(50) | FK → loan_applications | Reference to application |
| specialist_id | INTEGER | FK → specialists, NULLABLE | Assigned specialist |
| phase | VARCHAR(50) | NOT NULL | Task phase |
| task_title | VARCHAR(200) | NOT NULL | Task title |
| task_description | TEXT | | Task details |
| priority | INTEGER | DEFAULT 3 | 1=highest, 5=lowest |
| status | VARCHAR(50) | DEFAULT 'PENDING' | PENDING, READY, ASSIGNED, IN_PROGRESS, COMPLETED, SKIPPED |
| completion_notes | TEXT | | Notes on completion |
| completion_data | JSON | | Completion data |
| created_at | DATETIME | DEFAULT NOW() | Task creation |
| assigned_at | DATETIME | | Assignment time |
| started_at | DATETIME | | Work start time |
| completed_at | DATETIME | | Completion time |
| due_date | DATETIME | | SLA deadline |

---

### 8. subtask_notes (Specialist Notes)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| task_id | INTEGER | FK → specialist_tasks | Parent task |
| subtask_num | VARCHAR(10) | NOT NULL | Subtask number (01, 02, etc.) |
| note_text | TEXT | NOT NULL | Note content |
| author_id | INTEGER | FK → specialists | Note author |
| created_at | DATETIME | DEFAULT NOW() | Note creation |

---

### 9. workflow_task_definitions (Workflow Configuration)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| name | VARCHAR(200) | NOT NULL | Task name |
| description | TEXT | | Task description |
| phase_code | VARCHAR(50) | UNIQUE, NOT NULL | Phase identifier |
| order_index | INTEGER | DEFAULT 0 | Display order |
| sla_hours | FLOAT | | SLA in hours |
| color | VARCHAR(20) | DEFAULT '#0a4b94' | UI color |
| icon | VARCHAR(50) | | Icon name |
| is_active | BOOLEAN | DEFAULT TRUE | Active flag |
| created_at | DATETIME | DEFAULT NOW() | Creation time |
| updated_at | DATETIME | DEFAULT NOW() | Last update |
| created_by | INTEGER | FK → specialists | Creator |

---

### 10. subtask_definitions (Subtask Configuration)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| task_id | INTEGER | FK → workflow_task_definitions | Parent task |
| name | VARCHAR(200) | NOT NULL | Subtask name |
| description | TEXT | | Subtask description |
| order_index | INTEGER | DEFAULT 0 | Display order |
| default_specialist_id | INTEGER | FK → specialists | Default assignee |
| estimated_duration | INTEGER | DEFAULT 30 | Duration in minutes |
| sla_hours | FLOAT | | SLA in hours |
| is_required | BOOLEAN | DEFAULT TRUE | Required flag |
| is_active | BOOLEAN | DEFAULT TRUE | Active flag |
| created_at | DATETIME | DEFAULT NOW() | Creation time |
| updated_at | DATETIME | DEFAULT NOW() | Last update |

---

### 11. checklist_item_definitions (Checklist Items)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| subtask_id | INTEGER | FK → subtask_definitions | Parent subtask |
| name | VARCHAR(300) | NOT NULL | Item name |
| description | TEXT | | Item description |
| order_index | INTEGER | DEFAULT 0 | Display order |
| is_required | BOOLEAN | DEFAULT TRUE | Required flag |
| activity_category | VARCHAR(100) | | VERIFICATION, DOCUMENTATION, REVIEW, etc. |
| is_active | BOOLEAN | DEFAULT TRUE | Active flag |
| created_at | DATETIME | DEFAULT NOW() | Creation time |
| updated_at | DATETIME | DEFAULT NOW() | Last update |

---

### 12. allocation_history (Allocation Audit)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| event_type | VARCHAR(50) | NOT NULL | INITIAL_ALLOCATION, REALLOCATION, TASK_REASSIGNMENT |
| specialist_id | INTEGER | FK → specialists | Specialist involved |
| specialist_name | VARCHAR(200) | | Denormalized name |
| from_phase | VARCHAR(50) | | Previous phase |
| to_phase | VARCHAR(50) | | New phase |
| task_id | INTEGER | FK → specialist_tasks | Related task |
| application_id | VARCHAR(50) | | Related application |
| from_specialist_id | INTEGER | | Previous specialist |
| from_specialist_name | VARCHAR(200) | | Previous specialist name |
| to_specialist_id | INTEGER | | New specialist |
| to_specialist_name | VARCHAR(200) | | New specialist name |
| reason | VARCHAR(100) | | Reallocation reason |
| reason_details | TEXT | | Additional details |
| performed_by_id | INTEGER | FK → specialists | Who made change |
| performed_by_name | VARCHAR(200) | | Performer name |
| created_at | DATETIME | DEFAULT NOW() | Event time |

---

### 13. mock_api_calls (API Debug Log)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Internal ID |
| application_id | VARCHAR(50) | INDEX | Related application |
| api_name | VARCHAR(100) | NOT NULL | API identifier |
| endpoint | VARCHAR(200) | | API endpoint |
| method | VARCHAR(10) | | HTTP method |
| request_data | JSON | | Request payload |
| response_data | JSON | | Response payload |
| status_code | INTEGER | | HTTP status |
| timestamp | DATETIME | DEFAULT NOW() | Call time |
| duration_ms | INTEGER | | Call duration |

---

## PostgreSQL Setup

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Docker
docker run --name hlt-postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres:15
```

### 2. Create Database and User

```sql
-- Connect as superuser
psql -U postgres

-- Create database
CREATE DATABASE hlt_assumptions;

-- Create user
CREATE USER hlt_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hlt_assumptions TO hlt_user;

-- Connect to the database
\c hlt_assumptions

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO hlt_user;
```

### 3. PostgreSQL DDL Script

```sql
-- ============================================
-- HLT Assumptions App - PostgreSQL Schema
-- ============================================

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Loan Applications
CREATE TABLE loan_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(200),
    customer_email VARCHAR(200),
    customer_phone VARCHAR(50),
    ssn_last_four VARCHAR(4),
    property_address VARCHAR(500),
    loan_amount DECIMAL(15,2),
    original_borrower VARCHAR(200),
    current_phase VARCHAR(50) DEFAULT 'INTAKE',
    current_node VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    end_state VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_loan_app_id ON loan_applications(application_id);
CREATE INDEX idx_loan_app_status ON loan_applications(status);
CREATE INDEX idx_loan_app_phase ON loan_applications(current_phase);

-- 2. Workflow States
CREATE TABLE workflow_states (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    state_json JSONB NOT NULL,
    checkpoint_name VARCHAR(100),
    phase VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_state_app ON workflow_states(application_id);

-- 3. Agent Executions
CREATE TABLE agent_executions (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50),
    phase VARCHAR(50),
    input_state JSONB,
    output_state JSONB,
    decision VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER
);

CREATE INDEX idx_agent_exec_app ON agent_executions(application_id);
CREATE INDEX idx_agent_exec_name ON agent_executions(agent_name);

-- 4. Transaction Logs
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(200),
    description TEXT,
    data JSONB,
    previous_value JSONB,
    new_value JSONB,
    source_agent VARCHAR(100),
    source_node VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_app ON transaction_logs(application_id);
CREATE INDEX idx_transaction_type ON transaction_logs(event_type);

-- 5. Human Tasks
CREATE TABLE human_tasks (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    task_description TEXT,
    checkpoint VARCHAR(100),
    context_data JSONB,
    assigned_to VARCHAR(200),
    response JSONB,
    decision VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    is_manual_update BOOLEAN DEFAULT FALSE,
    manual_update_by VARCHAR(200),
    manual_update_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_human_task_app ON human_tasks(application_id);
CREATE INDEX idx_human_task_status ON human_tasks(status);

-- 6. Specialists
CREATE TABLE specialists (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    specialty_type VARCHAR(50),
    specialty_types JSONB DEFAULT '[]'::jsonb,
    dual_phase BOOLEAN DEFAULT FALSE,
    dual_phases JSONB DEFAULT '[]'::jsonb,
    role VARCHAR(50) DEFAULT 'specialist',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_specialist_username ON specialists(username);

-- 7. Specialist Tasks
CREATE TABLE specialist_tasks (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    specialist_id INTEGER REFERENCES specialists(id) ON DELETE SET NULL,
    phase VARCHAR(50) NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    task_description TEXT,
    priority INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'PENDING',
    completion_notes TEXT,
    completion_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP
);

CREATE INDEX idx_spec_task_app ON specialist_tasks(application_id);
CREATE INDEX idx_spec_task_specialist ON specialist_tasks(specialist_id);
CREATE INDEX idx_spec_task_status ON specialist_tasks(status);

-- 8. Subtask Notes
CREATE TABLE subtask_notes (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES specialist_tasks(id) ON DELETE CASCADE,
    subtask_num VARCHAR(10) NOT NULL,
    note_text TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES specialists(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtask_note_task ON subtask_notes(task_id);

-- 9. Workflow Task Definitions
CREATE TABLE workflow_task_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    phase_code VARCHAR(50) UNIQUE NOT NULL,
    order_index INTEGER DEFAULT 0,
    sla_hours DECIMAL(5,2),
    color VARCHAR(20) DEFAULT '#0a4b94',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES specialists(id)
);

-- 10. Subtask Definitions
CREATE TABLE subtask_definitions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES workflow_task_definitions(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    default_specialist_id INTEGER REFERENCES specialists(id),
    estimated_duration INTEGER DEFAULT 30,
    sla_hours DECIMAL(5,2),
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtask_def_task ON subtask_definitions(task_id);

-- 11. Checklist Item Definitions
CREATE TABLE checklist_item_definitions (
    id SERIAL PRIMARY KEY,
    subtask_id INTEGER NOT NULL REFERENCES subtask_definitions(id) ON DELETE CASCADE,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    activity_category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_subtask ON checklist_item_definitions(subtask_id);

-- 12. Allocation History
CREATE TABLE allocation_history (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    specialist_id INTEGER NOT NULL REFERENCES specialists(id),
    specialist_name VARCHAR(200),
    from_phase VARCHAR(50),
    to_phase VARCHAR(50),
    task_id INTEGER REFERENCES specialist_tasks(id),
    application_id VARCHAR(50),
    from_specialist_id INTEGER,
    from_specialist_name VARCHAR(200),
    to_specialist_id INTEGER,
    to_specialist_name VARCHAR(200),
    reason VARCHAR(100),
    reason_details TEXT,
    performed_by_id INTEGER REFERENCES specialists(id),
    performed_by_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alloc_history_specialist ON allocation_history(specialist_id);

-- 13. Mock API Calls
CREATE TABLE mock_api_calls (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(50),
    api_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200),
    method VARCHAR(10),
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);

CREATE INDEX idx_mock_api_app ON mock_api_calls(application_id);

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loan_applications_updated_at
    BEFORE UPDATE ON loan_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_task_definitions_updated_at
    BEFORE UPDATE ON workflow_task_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtask_definitions_updated_at
    BEFORE UPDATE ON subtask_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_item_definitions_updated_at
    BEFORE UPDATE ON checklist_item_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4. Update Python Configuration

Update your SQLAlchemy connection string in the backend:

```python
# For SQLite (current)
SQLALCHEMY_DATABASE_URL = "sqlite:///./loan_workflow.db"

# For PostgreSQL
SQLALCHEMY_DATABASE_URL = "postgresql://hlt_user:your_secure_password@localhost:5432/hlt_assumptions"
```

Install PostgreSQL driver:

```bash
pip install psycopg2-binary
# or for async
pip install asyncpg
```

---

## Data Migration (SQLite to PostgreSQL)

```bash
# 1. Export from SQLite
sqlite3 loan_workflow.db .dump > sqlite_dump.sql

# 2. Convert to PostgreSQL format (manual adjustments needed)
# - Change INTEGER PRIMARY KEY to SERIAL
# - Change DATETIME to TIMESTAMP
# - Change JSON to JSONB

# 3. Or use pgloader (automated)
pgloader sqlite:///path/to/loan_workflow.db postgresql://hlt_user:password@localhost/hlt_assumptions
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total Tables | 13 |
| Core Business Tables | 5 |
| User/Task Management | 4 |
| Workflow Configuration | 3 |
| Audit/Logging | 1 |

| Table | Estimated Row Growth |
|-------|---------------------|
| loan_applications | Low (100s-1000s) |
| workflow_states | Medium (5-10 per application) |
| agent_executions | High (20-50 per application) |
| transaction_logs | Very High (100+ per application) |
| specialist_tasks | Low (1 per phase per application) |

---

## Backup Recommendations

```bash
# PostgreSQL daily backup
pg_dump -U hlt_user -d hlt_assumptions > backup_$(date +%Y%m%d).sql

# With compression
pg_dump -U hlt_user -d hlt_assumptions | gzip > backup_$(date +%Y%m%d).sql.gz
```
