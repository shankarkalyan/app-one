import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LuBriefcase,
  LuLogOut,
  LuClock,
  LuCirclePlay,
  LuCircleCheckBig,
  LuCircleAlert,
  LuRefreshCw,
  LuChevronDown,
  LuChevronRight,
  LuFileText,
  LuDollarSign,
  LuUser,
  LuCalendar,
  LuHistory,
  LuChartBar,
  LuHouse,
  LuArrowRight,
  LuMapPin,
  LuPhone,
  LuMail,
  LuActivity,
  LuEye,
  LuZap,
  LuShield,
  LuSend,
  LuDownload,
  LuClipboardCheck,
  LuSearch,
  LuUserCheck,
  LuScale,
  LuStamp,
  LuAward,
  LuKey,
  LuDatabase,
  LuListChecks,
  LuMessageSquare,
  LuPlus,
  LuTimer,
  LuSun,
  LuMoon,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { getApplication, getAgentExecutions, getWorkflowTasks } from '../services/api';
import { format, formatDistanceToNow, differenceInMilliseconds, isPast } from 'date-fns';

// Phase configuration for workflow progress
const WORKFLOW_PHASES = [
  { key: 'INTAKE', label: 'Intake', order: 1 },
  { key: 'APPLICATION', label: 'Application', order: 2 },
  { key: 'DISCLOSURE', label: 'Disclosure', order: 3 },
  { key: 'LOAN_REVIEW', label: 'Loan Review', order: 4 },
  { key: 'UNDERWRITING', label: 'Underwriting', order: 5 },
  { key: 'HUMAN_DECISION', label: 'Decision', order: 6 },
  { key: 'COMMITMENT', label: 'Commitment', order: 7 },
  { key: 'CLOSING', label: 'Closing', order: 8 },
  { key: 'POST_CLOSING', label: 'Post-Closing', order: 9 },
];

// Icon mapping for activity categories
const CATEGORY_ICONS = {
  VERIFICATION: Shield,
  DOCUMENTATION: FileText,
  COMMUNICATION: Phone,
  PROCESSING: Zap,
  REVIEW: Eye,
  COMPLIANCE: ClipboardCheck,
  APPROVAL: Award,
  OTHER: Activity,
};

// Map activity category to type for display
const categoryToType = (category) => {
  const mapping = {
    'VERIFICATION': 'system',
    'DOCUMENTATION': 'agent',
    'COMMUNICATION': 'customer',
    'PROCESSING': 'system',
    'REVIEW': 'agent',
    'COMPLIANCE': 'system',
    'APPROVAL': 'agent',
    'OTHER': 'agent',
  };
  return mapping[category] || 'agent';
};

// SLA Status calculation
// Returns: { status: 'overdue' | 'warning' | 'normal', timeLeft: string | null }
const getSLAStatus = (task) => {
  if (!task.due_date) {
    return { status: 'normal', timeLeft: null };
  }

  const now = new Date();
  const dueDate = new Date(task.due_date);
  const assignedAt = task.assigned_at ? new Date(task.assigned_at) : new Date(task.created_at);

  // Check if overdue
  if (isPast(dueDate)) {
    return { status: 'overdue', timeLeft: null };
  }

  // Calculate progress percentage
  const totalDuration = differenceInMilliseconds(dueDate, assignedAt);
  const elapsed = differenceInMilliseconds(now, assignedAt);
  const percentElapsed = (elapsed / totalDuration) * 100;

  // If 80% or more elapsed, show warning
  if (percentElapsed >= 80) {
    const timeLeft = formatDistanceToNow(dueDate, { addSuffix: false });
    return { status: 'warning', timeLeft };
  }

  return { status: 'normal', timeLeft: null };
};

// Sort tasks by SLA status and due date
const sortTasksBySLA = (tasks) => {
  return [...tasks].sort((a, b) => {
    const statusA = getSLAStatus(a);
    const statusB = getSLAStatus(b);

    // Priority: overdue > warning > normal
    const priorityMap = { overdue: 0, warning: 1, normal: 2 };
    const priorityDiff = priorityMap[statusA.status] - priorityMap[statusB.status];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // Within same status, sort by due_date (earliest first)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    return 0;
  });
};

const SpecialistWorkbench = () => {
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState({}); // Store application details for expanded tasks
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubtask, setExpandedSubtask] = useState(null); // Track which subtask is expanded
  const [completedSubtasks, setCompletedSubtasks] = useState({}); // Track completed subtasks per task
  const [subtaskLoading, setSubtaskLoading] = useState(null); // Track loading state for subtask completion
  const [expandedAccordion, setExpandedAccordion] = useState({}); // Track which accordion is expanded per subtask
  const [subtaskNotes, setSubtaskNotes] = useState({}); // Store notes per task-subtask
  const [noteInput, setNoteInput] = useState(''); // Current note being typed
  const [savingNote, setSavingNote] = useState(false); // Loading state for saving notes
  const [workflowDefinitions, setWorkflowDefinitions] = useState({}); // Workflow definitions from API
  const [loadingWorkflow, setLoadingWorkflow] = useState(true); // Loading state for workflow definitions

  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (isAdmin) {
      // Admins should use the Admin Dashboard, not Specialist Workbench
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchData = async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        api.get('/specialist/tasks'),
        api.get('/specialist/stats'),
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/specialist/history?limit=50');
      setHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  // Fetch application details when a task is expanded
  const fetchTaskDetails = async (task) => {
    if (taskDetails[task.application_id]) return; // Already loaded

    try {
      const [appData, executions] = await Promise.all([
        getApplication(task.application_id),
        getAgentExecutions(task.application_id),
      ]);
      setTaskDetails(prev => ({
        ...prev,
        [task.application_id]: { application: appData, executions },
      }));
    } catch (error) {
      console.error('Failed to fetch task details:', error);
    }
  };

  // Fetch workflow definitions from API and transform to expected format
  const fetchWorkflowDefinitions = async () => {
    setLoadingWorkflow(true);
    try {
      const workflowTasks = await getWorkflowTasks();

      // Transform API data into PHASE_SUBTASKS format
      const definitions = {};
      let subtaskCounter = 1;

      workflowTasks.forEach((task) => {
        const phaseKey = task.phase_code;
        definitions[phaseKey] = (task.subtasks || []).map((subtask) => {
          const num = String(subtaskCounter++).padStart(2, '0');

          // Get icon based on first checklist item category or default
          const firstCategory = subtask.checklist_items?.[0]?.activity_category || 'OTHER';
          const IconComponent = CATEGORY_ICONS[firstCategory] || Activity;

          // Transform checklist items to activities
          const activities = (subtask.checklist_items || []).map(item => ({
            type: categoryToType(item.activity_category),
            text: item.name,
            category: item.activity_category,
            isRequired: item.is_required,
          }));

          return {
            num,
            label: subtask.name,
            icon: IconComponent,
            description: subtask.description || subtask.name,
            details: subtask.description || `Complete all checklist items for ${subtask.name}`,
            estimatedDuration: subtask.estimated_duration,
            isRequired: subtask.is_required,
            defaultSpecialist: subtask.default_specialist_name,
            activities,
          };
        });
      });

      setWorkflowDefinitions(definitions);
    } catch (error) {
      console.error('Failed to fetch workflow definitions:', error);
      // Keep workflowDefinitions empty - will show "No subtasks defined"
    }
    setLoadingWorkflow(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchWorkflowDefinitions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    if (activeTab === 'history') {
      await fetchHistory();
    }
    // Refresh expanded task details
    if (expandedTask) {
      const task = tasks.find(t => t.id === expandedTask);
      if (task) {
        setTaskDetails(prev => ({ ...prev, [task.application_id]: null }));
        await fetchTaskDetails(task);
      }
    }
    setRefreshing(false);
  };

  const handleExpandTask = async (task) => {
    if (expandedTask === task.id) {
      setExpandedTask(null);
    } else {
      setExpandedTask(task.id);
      await fetchTaskDetails(task);
      // Load notes for this task
      await loadTaskNotes(task.id);
    }
  };

  const loadTaskNotes = async (taskId) => {
    try {
      const res = await api.get(`/specialist/tasks/${taskId}/notes`);
      const notes = res.data;
      // Group notes by subtask
      const notesBySubtask = {};
      notes.forEach(note => {
        const key = `${taskId}-${note.subtask_num}`;
        if (!notesBySubtask[key]) {
          notesBySubtask[key] = [];
        }
        notesBySubtask[key].push({
          id: note.id,
          text: note.note_text,
          author: note.author_name,
          timestamp: note.created_at,
          subtaskNum: note.subtask_num,
          phase: note.phase,
        });
      });
      setSubtaskNotes(prev => ({ ...prev, ...notesBySubtask }));
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleCompleteTask = async (taskId, applicationId) => {
    setActionLoading(taskId);
    try {
      await api.post(`/specialist/tasks/${taskId}/complete`, {
        notes: `Completed by ${user?.full_name}`,
      });
      // Clear cached details and refresh
      setTaskDetails(prev => ({ ...prev, [applicationId]: null }));
      await fetchData();
      setExpandedTask(null);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
    setActionLoading(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get phase progress for visualization
  const getPhaseProgress = (currentPhase) => {
    const currentIndex = WORKFLOW_PHASES.findIndex(p => p.key === currentPhase);
    return WORKFLOW_PHASES.map((phase, idx) => ({
      ...phase,
      status: idx < currentIndex ? 'completed' : idx === currentIndex ? 'active' : 'pending',
    }));
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: isDark
        ? 'linear-gradient(135deg, #0B1929 0%, #112240 100%)'
        : 'linear-gradient(135deg, #f3f6fb 0%, #e2e8f0 100%)',
    },
    header: {
      background: isDark
        ? 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)'
        : 'linear-gradient(135deg, #003B73 0%, #0066cc 100%)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    headerIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: '20px',
      fontWeight: '700',
      margin: 0,
    },
    headerSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: '13px',
      margin: 0,
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    userBadge: {
      background: 'rgba(255,255,255,0.15)',
      padding: '8px 16px',
      borderRadius: '20px',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: '500',
    },
    iconButton: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(255,255,255,0.15)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s',
    },
    main: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    statCard: {
      background: isDark ? '#112240' : '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
    },
    statLabel: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '13px',
      fontWeight: '500',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
    },
    tab: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
    },
    tabActive: {
      background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
      color: '#ffffff',
    },
    taskList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    taskCard: {
      background: isDark ? '#112240' : '#ffffff',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.1)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
    },
    taskHeader: {
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: 'background 0.2s',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
    },
    taskHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
    },
    taskPhase: {
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
      color: '#ffffff',
      letterSpacing: '0.5px',
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px',
    },
    taskAppId: {
      fontSize: '13px',
      color: isDark ? '#64748b' : '#94a3b8',
      fontFamily: 'monospace',
    },
    taskStatus: {
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    taskDetails: {
      padding: '24px',
      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
    },
    // Workflow Progress Bar
    progressBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginBottom: '24px',
      padding: '16px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderRadius: '12px',
    },
    progressStep: {
      flex: 1,
      height: '8px',
      borderRadius: '4px',
      transition: 'all 0.3s',
    },
    progressLabel: {
      fontSize: '11px',
      color: isDark ? '#64748b' : '#94a3b8',
      textAlign: 'center',
      marginTop: '8px',
    },
    // Detail sections
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    detailCard: {
      background: isDark ? '#112240' : '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
    },
    detailCardTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    },
    detailLabel: {
      fontSize: '13px',
      color: isDark ? '#94a3b8' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    detailValue: {
      fontSize: '13px',
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    // Action buttons
    actionSection: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 24px',
      background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
      borderTop: `2px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
    },
    continueButton: {
      padding: '14px 32px',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      transition: 'all 0.2s',
    },
    viewAppLink: {
      color: '#117ACA',
      fontSize: '14px',
      fontWeight: '500',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    emptyIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
    },
  };

  const getStatusStyle = (status) => {
    const baseStyle = { ...styles.taskStatus };
    switch (status) {
      case 'ASSIGNED':
        return {
          ...baseStyle,
          background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
          color: '#3b82f6',
        };
      case 'IN_PROGRESS':
        return {
          ...baseStyle,
          background: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
          color: '#f59e0b',
        };
      case 'COMPLETED':
        return {
          ...baseStyle,
          background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
        };
      default:
        return {
          ...baseStyle,
          background: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
          color: '#64748b',
        };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return <LuClock size={14} />;
      case 'IN_PROGRESS':
        return <LuCirclePlay size={14} />;
      case 'COMPLETED':
        return <LuCircleCheckBig size={14} />;
      default:
        return <LuCircleAlert size={14} />;
    }
  };

  const renderPhaseProgress = (currentPhase) => {
    const phases = getPhaseProgress(currentPhase);
    return (
      <div style={styles.progressBar}>
        {phases.map((phase, idx) => (
          <div key={phase.key} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                ...styles.progressStep,
                background:
                  phase.status === 'completed'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : phase.status === 'active'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.1)',
              }}
            />
            <div
              style={{
                ...styles.progressLabel,
                color:
                  phase.status === 'active'
                    ? '#f59e0b'
                    : phase.status === 'completed'
                    ? '#10b981'
                    : undefined,
                fontWeight: phase.status === 'active' ? '600' : '400',
              }}
            >
              {phase.label}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTaskDetails = (task) => {
    const details = taskDetails[task.application_id];
    const app = details?.application;
    const isLoading = !details;

    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: isDark ? '#64748b' : '#94a3b8' }}>
          <LuRefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading application details...</p>
        </div>
      );
    }

    return (
      <div style={styles.taskDetails}>
        {/* Workflow Progress */}
        <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b' }}>
          WORKFLOW PROGRESS
        </div>
        {renderPhaseProgress(app?.current_phase || task.phase)}

        {/* Sub-Tasks Checklist */}
        <div style={{ marginTop: '24px' }}>
          {(() => {
            const totalSubtasks = workflowDefinitions[task.phase]?.length || 0;
            const isHistoryTask = task.status === 'COMPLETED';
            const completedCount = isHistoryTask ? totalSubtasks : (completedSubtasks[task.id]?.length || 0);

            return (
              <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: isHistoryTask ? '#10b981' : (isDark ? '#94a3b8' : '#64748b'), display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isHistoryTask ? <LuCircleCheckBig size={16} color="#10b981" /> : <LuListChecks size={16} />}
                {isHistoryTask ? 'COMPLETED SUB-TASKS' : 'SUB-TASKS TO COMPLETE'} ({completedCount}/{totalSubtasks})
              </div>
            );
          })()}
          {loadingWorkflow ? (
            <div style={{
              background: isDark ? '#112240' : '#ffffff',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <LuRefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: isDark ? '#64748b' : '#94a3b8' }} />
              <div style={{ fontSize: '13px', color: isDark ? '#64748b' : '#94a3b8' }}>Loading workflow steps...</div>
            </div>
          ) : !workflowDefinitions[task.phase] || workflowDefinitions[task.phase].length === 0 ? (
            <div style={{
              background: isDark ? '#112240' : '#ffffff',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <LuClipboardCheck size={32} style={{ marginBottom: '12px', color: isDark ? '#4a5568' : '#cbd5e1', opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: '500', color: isDark ? '#64748b' : '#94a3b8', marginBottom: '4px' }}>No subtasks defined for this phase</div>
              <div style={{ fontSize: '12px', color: isDark ? '#4a5568' : '#cbd5e1' }}>Configure subtasks in Workflow Config</div>
            </div>
          ) : (
          <div style={{
            background: isDark ? '#112240' : '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
          }}>
            {workflowDefinitions[task.phase].map((subtask, index) => {
                const SubtaskIcon = subtask.icon;
                const isHistoryTask = task.status === 'COMPLETED';
                const taskCompletedSubtasks = completedSubtasks[task.id] || [];
                // For history tasks, all subtasks are completed
                const isCompleted = isHistoryTask || taskCompletedSubtasks.includes(subtask.num);
                const isNext = !isHistoryTask && taskCompletedSubtasks.length === index;
                const isExpanded = expandedSubtask === `${task.id}-${subtask.num}`;
                const canComplete = !isHistoryTask && isNext && !taskCompletedSubtasks.includes(subtask.num);
                const isLoadingThis = subtaskLoading === `${task.id}-${subtask.num}`;

                const handleSubtaskClick = () => {
                  if (isExpanded) {
                    setExpandedSubtask(null);
                  } else {
                    setExpandedSubtask(`${task.id}-${subtask.num}`);
                  }
                };

                const handleCompleteSubtask = async (e) => {
                  e.stopPropagation();
                  setSubtaskLoading(`${task.id}-${subtask.num}`);

                  // Simulate processing time
                  await new Promise(resolve => setTimeout(resolve, 800));

                  setCompletedSubtasks(prev => ({
                    ...prev,
                    [task.id]: [...(prev[task.id] || []), subtask.num],
                  }));
                  setSubtaskLoading(null);
                  setExpandedSubtask(null);
                };

                return (
                  <div key={subtask.num}>
                    {/* Subtask Header - Clickable */}
                    <div
                      onClick={handleSubtaskClick}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        background: isExpanded
                          ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                          : isCompleted
                          ? (isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)')
                          : 'transparent',
                        borderBottom: index < workflowDefinitions[task.phase].length - 1
                          ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                          : 'none',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Expand/Collapse Icon */}
                      <div style={{ flexShrink: 0 }}>
                        {isExpanded ? (
                          <LuChevronDown size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                        ) : (
                          <LuChevronRight size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                        )}
                      </div>

                      {/* Subtask Icon */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isCompleted
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : isNext
                          ? 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)'
                          : (isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: isNext && !isCompleted ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                      }}>
                        {isCompleted ? (
                          <LuCircleCheckBig size={18} color="#ffffff" />
                        ) : (
                          <SubtaskIcon size={18} color={isNext ? '#ffffff' : (isDark ? '#64748b' : '#94a3b8')} />
                        )}
                      </div>

                      {/* Subtask Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '2px',
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: isCompleted ? '#10b981' : (isNext ? '#3b82f6' : (isDark ? '#64748b' : '#94a3b8')),
                            background: isCompleted
                              ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')
                              : (isNext
                                ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                                : (isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)')),
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>
                            {subtask.num}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: isCompleted
                              ? '#10b981'
                              : (isNext ? (isDark ? '#e2e8f0' : '#1e293b') : (isDark ? '#64748b' : '#94a3b8')),
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}>
                            {subtask.label}
                          </span>
                          {isNext && !isCompleted && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              color: '#f59e0b',
                              background: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              textTransform: 'uppercase',
                            }}>
                              Current
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: isDark ? '#64748b' : '#94a3b8',
                        }}>
                          {subtask.description}
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isCompleted
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        border: isCompleted ? 'none' : `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isCompleted && <LuCircleCheckBig size={16} color="#ffffff" />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (() => {
                      const subtaskKey = `${task.id}-${subtask.num}`;
                      const isActivitiesOpen = expandedAccordion[subtaskKey] === 'activities';
                      const isLogOpen = expandedAccordion[subtaskKey] === 'log';
                      const currentNotes = subtaskNotes[subtaskKey] || [];

                      const toggleAccordion = (type) => {
                        setExpandedAccordion(prev => ({
                          ...prev,
                          [subtaskKey]: prev[subtaskKey] === type ? null : type,
                        }));
                      };

                      const handleAddNote = async () => {
                        if (!noteInput.trim()) return;
                        setSavingNote(true);

                        const newNote = {
                          id: Date.now(),
                          text: noteInput.trim(),
                          author: user?.full_name || 'Specialist',
                          timestamp: new Date().toISOString(),
                          subtaskNum: subtask.num,
                          subtaskLabel: subtask.label,
                          phase: task.phase,
                        };

                        // Save note to backend
                        try {
                          await api.post(`/specialist/tasks/${task.id}/notes`, {
                            subtask_num: subtask.num,
                            note_text: noteInput.trim(),
                          });
                        } catch (error) {
                          console.error('Failed to save note:', error);
                        }

                        setSubtaskNotes(prev => ({
                          ...prev,
                          [subtaskKey]: [...(prev[subtaskKey] || []), newNote],
                        }));
                        setNoteInput('');
                        setSavingNote(false);
                      };

                      return (
                        <div style={{
                          padding: '0 20px 20px 68px',
                          background: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.02)',
                          borderBottom: index < workflowDefinitions[task.phase].length - 1
                            ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                            : 'none',
                        }}>
                          {/* Details text */}
                          <div style={{
                            fontSize: '13px',
                            color: isDark ? '#94a3b8' : '#64748b',
                            marginBottom: '16px',
                            padding: '12px 16px',
                            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                            borderRadius: '8px',
                            borderLeft: '3px solid #3b82f6',
                          }}>
                            {subtask.details}
                          </div>

                          {/* Activities Accordion */}
                          <div style={{
                            marginBottom: '12px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          }}>
                            {/* Activities Header */}
                            <div
                              onClick={() => toggleAccordion('activities')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <LuActivity size={16} color="#3b82f6" />
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: isDark ? '#e2e8f0' : '#1e293b',
                                }}>
                                  Activities
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  color: '#3b82f6',
                                  background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                }}>
                                  {subtask.activities.length}
                                </span>
                              </div>
                              {isActivitiesOpen ? (
                                <LuChevronDown size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                              ) : (
                                <LuChevronRight size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                              )}
                            </div>

                            {/* Activities Content */}
                            {isActivitiesOpen && (
                              <div style={{
                                padding: '12px 16px',
                                background: isDark ? 'rgba(0,0,0,0.15)' : '#ffffff',
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {subtask.activities.map((activity, actIdx) => (
                                    <div
                                      key={actIdx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        borderRadius: '8px',
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                      }}
                                    >
                                      <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        background: activity.type === 'customer'
                                          ? (isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)')
                                          : activity.type === 'agent'
                                          ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                                          : (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}>
                                        {activity.type === 'customer' ? (
                                          <LuUser size={12} color="#8b5cf6" />
                                        ) : activity.type === 'agent' ? (
                                          <LuUserCheck size={12} color="#3b82f6" />
                                        ) : (
                                          <LuZap size={12} color="#10b981" />
                                        )}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{
                                          fontSize: '10px',
                                          fontWeight: '600',
                                          color: activity.type === 'customer'
                                            ? '#8b5cf6'
                                            : activity.type === 'agent'
                                            ? '#3b82f6'
                                            : '#10b981',
                                          marginBottom: '2px',
                                          textTransform: 'uppercase',
                                        }}>
                                          {activity.type === 'customer' ? 'Customer' : activity.type === 'agent' ? 'Agent' : 'System'}
                                        </div>
                                        <div style={{
                                          fontSize: '13px',
                                          color: isDark ? '#e2e8f0' : '#374151',
                                        }}>
                                          {activity.text}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Activities Log Accordion */}
                          <div style={{
                            marginBottom: '16px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          }}>
                            {/* Log Header */}
                            <div
                              onClick={() => toggleAccordion('log')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <LuMessageSquare size={16} color="#8b5cf6" />
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: isDark ? '#e2e8f0' : '#1e293b',
                                }}>
                                  Activities Log
                                </span>
                                {currentNotes.length > 0 && (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    color: '#8b5cf6',
                                    background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                  }}>
                                    {currentNotes.length} note{currentNotes.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {isLogOpen ? (
                                <LuChevronDown size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                              ) : (
                                <LuChevronRight size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                              )}
                            </div>

                            {/* Log Content */}
                            {isLogOpen && (
                              <div style={{
                                padding: '12px 16px',
                                background: isDark ? 'rgba(0,0,0,0.15)' : '#ffffff',
                              }}>
                                {/* Existing Notes */}
                                {currentNotes.length > 0 && (
                                  <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {currentNotes.map((note) => (
                                      <div
                                        key={note.id}
                                        style={{
                                          padding: '12px 14px',
                                          background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                                          borderRadius: '8px',
                                          borderLeft: '3px solid #8b5cf6',
                                        }}
                                      >
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          marginBottom: '6px',
                                        }}>
                                          <span style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#8b5cf6',
                                          }}>
                                            {note.author}
                                          </span>
                                          <span style={{
                                            fontSize: '11px',
                                            color: isDark ? '#64748b' : '#94a3b8',
                                          }}>
                                            {new Date(note.timestamp).toLocaleString()}
                                          </span>
                                        </div>
                                        <div style={{
                                          fontSize: '13px',
                                          color: isDark ? '#e2e8f0' : '#374151',
                                          lineHeight: '1.5',
                                        }}>
                                          {note.text}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add Note Input */}
                                <div style={{
                                  display: 'flex',
                                  gap: '8px',
                                  alignItems: 'flex-start',
                                }}>
                                  <textarea
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder="Add a note for this sub-task..."
                                    style={{
                                      flex: 1,
                                      padding: '10px 14px',
                                      borderRadius: '8px',
                                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                                      background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
                                      color: isDark ? '#e2e8f0' : '#1e293b',
                                      fontSize: '13px',
                                      resize: 'vertical',
                                      minHeight: '60px',
                                      outline: 'none',
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = '#8b5cf6';
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                                    }}
                                  />
                                  <button
                                    onClick={handleAddNote}
                                    disabled={!noteInput.trim() || savingNote}
                                    style={{
                                      padding: '10px 16px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: noteInput.trim() && !savingNote
                                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                                        : (isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'),
                                      color: noteInput.trim() && !savingNote ? '#ffffff' : (isDark ? '#64748b' : '#94a3b8'),
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      cursor: noteInput.trim() && !savingNote ? 'pointer' : 'not-allowed',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: noteInput.trim() && !savingNote ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                                    }}
                                  >
                                    {savingNote ? (
                                      <LuRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                      <LuPlus size={14} />
                                    )}
                                    Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Complete Button */}
                          {canComplete && (
                            <button
                              onClick={handleCompleteSubtask}
                              disabled={isLoadingThis}
                              style={{
                                width: '100%',
                                padding: '12px 20px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isLoadingThis
                                  ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)')
                                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isLoadingThis ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: isLoadingThis ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s',
                              }}
                            >
                              {isLoadingThis ? (
                                <>
                                  <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <LuCircleCheckBig size={16} />
                                  Complete Sub-Task
                                </>
                              )}
                            </button>
                          )}

                          {isCompleted && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '12px 16px',
                              background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                              borderRadius: '10px',
                              color: '#10b981',
                              fontSize: '14px',
                              fontWeight: '500',
                            }}>
                              <LuCircleCheckBig size={16} />
                              Sub-task completed
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Section */}
        {activeTab === 'tasks' && (() => {
          const phaseSubtasks = workflowDefinitions[task.phase] || [];
          const taskCompletedSubtasks = completedSubtasks[task.id] || [];
          const allSubtasksCompleted = phaseSubtasks.length > 0 && taskCompletedSubtasks.length >= phaseSubtasks.length;
          const canComplete = phaseSubtasks.length === 0 || allSubtasksCompleted;

          return (
            <div style={{
              ...styles.actionSection,
              background: canComplete
                ? (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)')
                : (isDark ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.05)'),
              borderTop: `2px solid ${canComplete
                ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)')
                : (isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)')}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link
                  to={`/applications/${task.application_id}`}
                  style={styles.viewAppLink}
                >
                  <LuEye size={16} />
                  View Full Application
                </Link>
                {!canComplete && (
                  <span style={{
                    fontSize: '13px',
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <LuCircleAlert size={14} />
                    Complete all sub-tasks first ({taskCompletedSubtasks.length}/{phaseSubtasks.length})
                  </span>
                )}
              </div>
              <button
                style={{
                  ...styles.continueButton,
                  opacity: canComplete && actionLoading !== task.id ? 1 : 0.5,
                  cursor: canComplete && actionLoading !== task.id ? 'pointer' : 'not-allowed',
                  background: canComplete
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : (isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.2)'),
                  boxShadow: canComplete ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                }}
                onClick={() => {
                  if (canComplete) {
                    handleCompleteTask(task.id, task.application_id);
                    // Clear completed subtasks for this task after completing
                    setCompletedSubtasks(prev => {
                      const newState = { ...prev };
                      delete newState[task.id];
                      return newState;
                    });
                  }
                }}
                disabled={!canComplete || actionLoading === task.id}
              >
                {actionLoading === task.id ? (
                  <LuRefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <LuArrowRight size={20} />
                )}
                {allSubtasksCompleted ? 'Complete Phase & Continue' : 'Continue to Next Phase'}
              </button>
            </div>
          );
        })()}
      </div>
    );
  };

  // Sort tasks by SLA status for the "My Tasks" tab
  const displayTasks = activeTab === 'tasks' ? sortTasksBySLA(tasks) : history;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={{
        height: '64px',
        background: 'linear-gradient(135deg, rgb(11, 25, 41) 0%, rgb(17, 34, 64) 40%, rgb(26, 54, 93) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}>
        {/* Left: Logo, Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <LuBriefcase size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#ffffff',
            }}>
              Specialist Workbench
            </h1>
          </div>
          {/* Specialty Badge */}
          <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#93c5fd',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {user?.specialty_type?.replace('_', ' ')}
          </span>
          {/* Online Status */}
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(20, 113, 58, 0.2)',
            color: 'rgb(74, 222, 128)',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'rgb(74, 222, 128)',
              animation: 'pulse 2s ease infinite',
            }}></span>
            Online
          </span>
        </div>

        {/* Right: Navigation & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '3px',
          }}>
            <button
              onClick={() => setActiveTab('tasks')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'tasks' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LuBriefcase size={14} />
              My Tasks
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'history' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LuHistory size={14} />
              History
            </button>
          </div>

          {/* Applications Button */}
          <button
            onClick={() => navigate('/applications')}
            title="View Applications"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LuFileText size={14} />
            Applications
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Refresh"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuRefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* User Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px 4px 4px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '11px',
              color: '#ffffff',
            }}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
            }}>
              {user?.full_name}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title={`Logout (${user?.full_name})`}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: 'rgb(252, 165, 165)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <LuLogOut size={14} />
            Logout
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isDark ? <LuSun size={18} /> : <LuMoon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              <LuBriefcase size={16} color="#3b82f6" />
              Active Tasks
            </div>
            <div style={{ ...styles.statValue, color: '#3b82f6' }}>
              {(stats?.pending || 0) + (stats?.in_progress || 0)}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              <LuCircleCheckBig size={16} color="#10b981" />
              Completed Today
            </div>
            <div style={{ ...styles.statValue, color: '#10b981' }}>
              {stats?.completed_today || 0}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              <LuTimer size={16} color="#ec4899" />
              Avg Completion Time
            </div>
            <div style={{ ...styles.statValue, color: '#ec4899', fontSize: stats?.avg_completion_time_minutes > 60 ? '22px' : '28px' }}>
              {stats?.avg_completion_time_minutes != null
                ? stats.avg_completion_time_minutes >= 60
                  ? `${Math.floor(stats.avg_completion_time_minutes / 60)}h ${Math.round(stats.avg_completion_time_minutes % 60)}m`
                  : `${Math.round(stats.avg_completion_time_minutes)}m`
                : '--'}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              <LuChartBar size={16} color="#8b5cf6" />
              Total Completed
            </div>
            <div style={{ ...styles.statValue, color: '#8b5cf6' }}>
              {stats?.total_completed || 0}
            </div>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div style={styles.emptyState}>
            <LuRefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading tasks...</p>
          </div>
        ) : displayTasks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <LuCircleCheckBig size={32} color={isDark ? '#64748b' : '#94a3b8'} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: isDark ? '#e2e8f0' : '#1e293b' }}>
              {activeTab === 'tasks' ? 'All caught up!' : 'No history yet'}
            </h3>
            <p style={{ margin: 0 }}>
              {activeTab === 'tasks'
                ? 'No pending tasks assigned to you.'
                : 'Complete some tasks to see them here.'}
            </p>
          </div>
        ) : (
          <div style={styles.taskList}>
            {displayTasks.map((task) => (
              <div key={task.id} style={styles.taskCard}>
                <div
                  style={styles.taskHeader}
                  onClick={() => handleExpandTask(task)}
                >
                  <div style={styles.taskHeaderLeft}>
                    {expandedTask === task.id ? (
                      <LuChevronDown size={22} color={isDark ? '#64748b' : '#94a3b8'} />
                    ) : (
                      <LuChevronRight size={22} color={isDark ? '#64748b' : '#94a3b8'} />
                    )}
                    <span style={styles.taskPhase}>{task.phase.replace('_', ' ')}</span>
                    <div style={styles.taskInfo}>
                      <div style={styles.taskTitle}>{task.task_title}</div>
                      <div style={styles.taskAppId}>
                        {task.application_id} | {task.customer_name || 'Customer'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* History tab - show completed badge with timestamp */}
                    {activeTab === 'history' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                      }}>
                        <LuCircleCheckBig size={16} color="#10b981" />
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#10b981',
                        }}>
                          Completed
                        </span>
                        {task.completed_at && (
                          <span style={{
                            fontSize: '12px',
                            color: isDark ? '#64748b' : '#94a3b8',
                            borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            paddingLeft: '8px',
                            marginLeft: '4px',
                          }}>
                            {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    )}
                    {/* My Tasks tab - show status with timestamp */}
                    {activeTab === 'tasks' && (
                      <>
                        {/* SLA Badge */}
                        {(() => {
                          const slaStatus = getSLAStatus(task);
                          if (slaStatus.status === 'overdue') {
                            return (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                                animation: 'pulse 2s ease infinite',
                              }}>
                                <LuCircleAlert size={14} color="#ef4444" />
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#ef4444',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                }}>
                                  Overdue
                                </span>
                              </div>
                            );
                          }
                          if (slaStatus.status === 'warning') {
                            return (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
                                border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.3)'}`,
                              }}>
                                <LuTimer size={14} color="#f97316" />
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#f97316',
                                }}>
                                  Due in {slaStatus.timeLeft}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {task.assigned_at && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}>
                            <LuClock size={14} />
                            <span>Assigned: {format(new Date(task.assigned_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                        <span style={{
                          ...styles.taskStatus,
                          background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                        }}>
                          <LuBriefcase size={14} />
                          Active
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {expandedTask === task.id && renderTaskDetails(task)}
              </div>
            ))}
          </div>
        )}
      </main>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default SpecialistWorkbench;
