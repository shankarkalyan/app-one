# Agentic Workflow UI - Reusable Prompt

Use this prompt to create a similar look and feel for any agentic workflow application with different nodes/phases.

---

## PROMPT

```
Create a React application for an Agentic Workflow Tracker with the following design system and features:

## DESIGN SYSTEM

### Color Palette
- **Dark Mode Background**: #0f172a (page), rgba(30, 41, 59, 0.9) (cards)
- **Light Mode Background**: #f8fafc (page), rgba(255, 255, 255, 0.95) (cards)
- **Phase Colors** (assign unique colors to each phase):
  - Phase 1: #3b82f6 (blue)
  - Phase 2: #8b5cf6 (purple)
  - Phase 3: #06b6d4 (cyan)
  - Phase 4: #f59e0b (amber)
  - Phase 5: #10b981 (green)
  - Denial/Error: #ef4444 (red)

### Typography
- Font: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif
- Primary Text: #f1f5f9 (dark) / #0f172a (light)
- Secondary Text: #94a3b8 (dark) / #64748b (light)
- Muted Text: #64748b (dark) / #94a3b8 (light)

### Status Colors
- Completed: #10b981 (green) with rgba(16, 185, 129, 0.15) background
- Active/In Progress: #3b82f6 (blue) with rgba(59, 130, 246, 0.15) background
- Pending: #64748b (gray) with rgba(100, 116, 139, 0.1) background
- Denied/Error: #ef4444 (red)

## WORKFLOW STAGE TRACKER COMPONENT

### Structure
Create a collapsible, hierarchical workflow tracker with:
1. **Header Section**:
   - Application ID with copy button
   - Animated circular progress indicator (SVG)
   - Progress percentage with animated counter
   - Stats row showing: Nodes Executed, API Calls, Total Duration

2. **Phase Progress Bar**:
   - Horizontal bar showing all phases as connected nodes
   - Each node shows phase icon, color, and completion state
   - Connecting lines between nodes
   - Animated appearance (nodes appear one by one with 1 second delay)
   - Loading spinner on currently processing node

3. **Expandable Phase Sections**:
   - Each phase is a collapsible accordion
   - Shows phase icon, name, status badge, and stage count
   - Colored left border matching phase color
   - Completed phases highlighted with green tint background
   - Pending phases are dimmed/grayed out

4. **Stage/Task Items** (within each phase):
   - Numbered stages (01, 02, 03, etc.)
   - Stage icon and label
   - Status indicator (checkmark, spinner, or circle)
   - "Complete" button for manual task completion
   - Expandable to show:
     - Description and details
     - Conversation timeline (chat-like UI)
     - API calls with expandable JSON payloads

### Conversation Timeline UI
Display workflow interactions as a chat-like timeline:
- **Customer messages**: Left-aligned, user icon
- **Agent messages**: Right-aligned, agent name shown
- **System messages**: Center-aligned, bot icon, colored by status
- Each message shows: icon, text, timestamp, status badge
- API call results shown as expandable code blocks

### API Call Display
For each API integration:
- Show API name with category badge
- Icon representing the service
- Purpose/description of what it does
- Expandable request/response JSON viewer
- Duration and status indicators

## INTERACTIVE FEATURES

1. **Manual Task Completion**:
   - "Complete" button on each non-completed task
   - Optimistic UI updates (immediate visual feedback)
   - Sequential task completion (completing task N marks 1..N as done)

2. **Expand/Collapse**:
   - Click phase header to expand/collapse
   - Click stage to show conversation details
   - Smooth CSS transitions (0.3s ease)

3. **Auto-scroll**:
   - When expanding a stage, auto-scroll to bring it into view
   - Smooth scroll behavior

4. **Copy to Clipboard**:
   - Application ID copy button
   - JSON data copy button in modals

## APPLICATION LIST PAGE

### Table Design
- Filterable columns: ID, Status, Phase, Created Date
- Status badges with colored backgrounds
- Mini progress tracker in each row showing current phase
- Expandable rows to show full WorkflowStageTracker
- Auto-refresh every 5 seconds for in-progress items

### Status Badges
```jsx
const getStatusBadge = (status) => ({
  'IN_PROGRESS': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: Clock },
  'COMPLETED': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: CheckCircle },
  'DENIED': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: XCircle },
  'PENDING': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: AlertTriangle },
});
```

## FORM WIZARD (New Application)

### Step Progress Indicator
- Horizontal step indicator at top
- Circles with numbers for each step
- Connecting lines between steps
- Completed steps show checkmarks
- Current step highlighted with phase color

### Form Styling
- Card-based sections with subtle shadows
- Input fields with consistent padding and borders
- Dark/light mode aware colors
- Auto-focus on submit button at final step

## THEME CONTEXT

Implement a ThemeContext with:
```jsx
const theme = {
  pageBg: isDark ? '#0f172a' : '#f8fafc',
  cardBg: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
  textPrimary: isDark ? '#f1f5f9' : '#0f172a',
  textSecondary: isDark ? '#94a3b8' : '#64748b',
  border: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)',
  completed: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  active: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  pending: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' },
  shadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
};
```

## ICONS

Use Lucide React icons:
- ChevronDown, ChevronRight (expand/collapse)
- CheckCircle (completed), Clock (in progress), Circle (pending), XCircle (denied)
- Bot (system), User (customer), MessageSquare (agent)
- Copy, FileJson, Loader2 (loading spinner)
- Phase-specific icons based on your workflow

## ANIMATIONS

1. **Progress nodes**: Appear one by one with 1-second intervals
2. **Progress percentage**: Animated counter from 0 to current value
3. **Stats counters**: Animated from 0 to current value
4. **Expand/collapse**: CSS transitions (0.3s ease)
5. **Hover effects**: Scale transform and shadow changes
6. **Loading spinners**: CSS animation rotate 1s linear infinite

## CUSTOMIZATION POINTS

To adapt for your workflow, modify:

1. **PHASES array**: Define your workflow phases
```jsx
const PHASES = [
  {
    id: 1,
    name: 'Your Phase Name',
    shortName: 'Short',
    icon: YourIcon,
    color: '#hexcolor',
    description: 'Phase description',
    stages: [
      {
        num: '01',
        label: 'Stage Label',
        icon: StageIcon,
        description: 'What this stage does',
        apis: ['APIName1', 'APIName2'],
      },
      // ... more stages
    ],
  },
  // ... more phases
];
```

2. **API_DETAILS object**: Define your API integrations
```jsx
const API_DETAILS = {
  'YourAPI': {
    icon: APIIcon,
    category: 'Category',
    color: '#hexcolor',
    description: 'What this API does',
    endpoints: {
      '/endpoint': {
        purpose: 'Detailed purpose',
        action: 'Action verb for UI',
      },
    },
  },
};
```

3. **Backend phase mappings**: Map your backend states to frontend phases
```jsx
const BACKEND_PHASE_TO_FRONTEND_IDX = {
  'BACKEND_PHASE_1': 0,
  'BACKEND_PHASE_2': 1,
  // ...
};
```
```

---

## EXAMPLE WORKFLOW DEFINITION

Here's an example of how to define a different workflow (e.g., Customer Onboarding):

```jsx
const PHASES = [
  {
    id: 1,
    name: 'Identity Verification',
    shortName: 'Identity',
    icon: Shield,
    color: '#3b82f6',
    description: 'Verify customer identity',
    stages: [
      { num: '01', label: 'Document Upload', icon: Upload, description: 'Customer uploads ID documents', apis: ['DocumentAI'] },
      { num: '02', label: 'KYC Check', icon: UserCheck, description: 'Run Know Your Customer verification', apis: ['KYCService'] },
    ],
  },
  {
    id: 2,
    name: 'Account Setup',
    shortName: 'Setup',
    icon: Settings,
    color: '#8b5cf6',
    description: 'Configure customer account',
    stages: [
      { num: '03', label: 'Preferences', icon: Sliders, description: 'Set account preferences', apis: [] },
      { num: '04', label: 'Notifications', icon: Bell, description: 'Configure notifications', apis: ['NotificationService'] },
    ],
  },
  // ... more phases
];
```

---

## KEY VISUAL ELEMENTS TO MAINTAIN

1. **Glassmorphism cards**: Semi-transparent backgrounds with blur
2. **Gradient accents**: Linear gradients on buttons and highlights
3. **Subtle shadows**: Different for dark/light modes
4. **Consistent spacing**: 8px base unit (8, 16, 24, 32px)
5. **Rounded corners**: 8px for inputs, 12px for cards, 16px for modals
6. **Phase color coding**: Each phase has a unique, consistent color throughout
7. **Status consistency**: Same colors for completed/active/pending everywhere
