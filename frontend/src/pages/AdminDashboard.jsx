
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import {
  LuUsers,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuRefreshCw,
  LuHouse,
  LuBriefcase,
  LuCircleCheckBig,
  LuClock,
  LuCircleAlert,
  LuX,
  LuSave,
  LuEye,
  LuEyeOff,
  LuLogOut,
  LuActivity,
  LuTrendingUp,
  LuFileText,
  LuShield,
  LuZap,
  LuChartBar,
  LuChartPie,
  LuBell,
  LuSettings,
  LuSearch,
  LuFilter,
  LuChevronRight,
  LuArrowUpRight,
  LuArrowDownRight,
  LuCircle,
  LuCircleCheck,
  LuCircleX,
  LuCirclePlay,
  LuCirclePause,
  LuTarget,
  LuLayers,
  LuGitBranch,
  LuDatabase,
  LuServer,
  LuCpu,
  LuHardDrive,
  LuWifi,
  LuCalendar,
  LuUserCheck,
  LuUserX,
  LuClipboardList,
  LuTriangleAlert,
  LuMaximize2,
  LuMinimize2,
  LuInfo,
  LuSun,
  LuMoon,
  LuChevronDown,
  LuChevronUp,
  LuGripVertical,
  LuList,
  LuCopy,
  LuWorkflow,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  OverviewTab,
  AnalyticsTab,
  AllocationTab,
  WorkflowConfigTab,
  getAdminStyles,
  COLORS,
  SPECIALTY_TYPES as ADMIN_SPECIALTY_TYPES,
  REALLOCATION_REASONS as ADMIN_REALLOCATION_REASONS,
} from '../components/admin';
import api, {
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
  deleteWorkflowTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderWorkflowTasks,
  reorderSubtasks,
} from '../services/api';
import { format } from 'date-fns';

const SPECIALTY_TYPES = [
  'INTAKE',
  'APPLICATION',
  'DISCLOSURE',
  'LOAN_REVIEW',
  'UNDERWRITING',
  'COMMITMENT',
  'CLOSING',

  'POST_CLOSING',
];

const AdminDashboard = () => {
  const [specialists, setSpecialists] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [applications, setApplications] = useState([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    specialty_type: 'INTAKE',
    specialty_types: ['INTAKE'], // New: multiple specialty types
    role: 'specialist',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChart, setExpandedChart] = useState(null); // 'network', 'bar', 'donut', 'sankey'
  const [selectedNode, setSelectedNode] = useState(null); // For node click popup
  const [draggedSpecialist, setDraggedSpecialist] = useState(null);
  const [dragOverBucket, setDragOverBucket] = useState(null);
  const [updatingAllocation, setUpdatingAllocation] = useState(false);

  // Reallocation workflow state
  const [reallocationModal, setReallocationModal] = useState(false);
  const [reallocationData, setReallocationData] = useState(null); // { specialist, targetPhase, tasks }
  const [reallocationStep, setReallocationStep] = useState(1); // 1: warning, 2: reassign tasks, 3: reason
  const [taskReassignments, setTaskReassignments] = useState({}); // { taskId: targetSpecialistId }
  const [reallocationReason, setReallocationReason] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverSpecialist, setDragOverSpecialist] = useState(null);
  const [specialistTasks, setSpecialistTasks] = useState([]); // Actual tasks for the specialist
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [allocationSubTab, setAllocationSubTab] = useState('buckets'); // 'buckets', 'analytics', 'history'

  // Timeline drill-down state: 'month' -> 'week' -> 'day' -> 'hour'
  const [timelineDrillLevel, setTimelineDrillLevel] = useState('month');
  const [timelineDrillSelection, setTimelineDrillSelection] = useState(null); // { year, month, week, day }

  // History search
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Certification error modal state
  const [certificationError, setCertificationError] = useState(null); // { specialistName, targetPhase, specialtyTypes }

  // Hover tooltip state for specialist certifications
  const [hoveredSpecialist, setHoveredSpecialist] = useState(null); // { specialist, x, y }

  // Phase Transfer Modal state (for moving multi-certified specialists between phases)
  const [phaseTransferModal, setPhaseTransferModal] = useState(false);
  const [phaseTransferData, setPhaseTransferData] = useState(null); // { specialist, currentPhase, targetPhase, tasks }
  const [phaseTransferStep, setPhaseTransferStep] = useState(1); // 1: path selection, 2: reassign/dual, 3: confirm
  const [phaseTransferOption, setPhaseTransferOption] = useState('reassign'); // 'reassign' or 'dual'
  const [phaseTransferAssignments, setPhaseTransferAssignments] = useState({}); // { taskId: targetSpecialistId }
  const [phaseTransferLoading, setPhaseTransferLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); // { text, type }

  // Dual-Phase Removal Modal state (for removing dual-phase assignment)
  const [dualRemovalModal, setDualRemovalModal] = useState(false);
  const [dualRemovalData, setDualRemovalData] = useState(null); // { specialist, phases, tasks, keepPhase }
  const [dualRemovalStep, setDualRemovalStep] = useState(1); // 1: select phase to keep, 2: offboard tasks, 3: confirm
  const [dualRemovalAssignments, setDualRemovalAssignments] = useState({}); // { taskId: targetSpecialistId }
  const [dualRemovalLoading, setDualRemovalLoading] = useState(false);

  // Workflow Config state
  const [workflowTasks, setWorkflowTasks] = useState([]);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({}); // { taskId: true/false }
  const [expandedSubtasks, setExpandedSubtasks] = useState({}); // { subtaskId: true/false }
  const [editingTask, setEditingTask] = useState(null); // task object being edited
  const [editingSubtask, setEditingSubtask] = useState(null); // subtask object being edited
  const [editingChecklist, setEditingChecklist] = useState(null); // checklist item being edited
  const [workflowModal, setWorkflowModal] = useState(null); // 'task', 'subtask', 'checklist'
  const [workflowModalData, setWorkflowModalData] = useState(null); // parent data for new items
  const [workflowFormData, setWorkflowFormData] = useState({});
  const [savingWorkflow, setSavingWorkflow] = useState(false);
  const [workflowError, setWorkflowError] = useState('');

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    show: false,
    type: '', // 'task', 'subtask', 'checklist', 'specialist'
    item: null,
    itemName: '',
    onConfirm: null,
  });

  // Allocation Analytics refs
  const reasonsChartRef = useRef(null);
  const specialistChartRef = useRef(null);
  const timelineChartRef = useRef(null);
  const flowChartRef = useRef(null);
  const tasksCompletedChartRef = useRef(null);

  // Tasks completed by specialist data
  const [specialistTaskStats, setSpecialistTaskStats] = useState([]);

  const REALLOCATION_REASONS = [
    { id: 'sick_leave', label: 'Sick Leave', icon: '🏥' },
    { id: 'vacation', label: 'Vacation / PTO', icon: '🏖️' },
    { id: 'training', label: 'Training Session', icon: '📚' },
    { id: 'meeting', label: 'Extended Meeting', icon: '👥' },
    { id: 'workload', label: 'Workload Balancing', icon: '⚖️' },
    { id: 'emergency', label: 'Personal Emergency', icon: '🚨' },
    { id: 'other', label: 'Other Reason', icon: '📝' },
  ];

  // D3 visualization refs
  const networkGraphRef = useRef(null);
  const networkGraphExpandedRef = useRef(null);
  const barChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const sankeyRef = useRef(null);

  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      const [specialistsRes, workloadRes, appsRes] = await Promise.all([
        api.get('/admin/specialists'),
        api.get('/admin/workload-overview'),
        api.get('/applications?page_size=100'),
      ]);
      setSpecialists(specialistsRes.data);
      setWorkload(workloadRes.data);
      setApplications(appsRes.data.applications || []);
      setTotalApplications(appsRes.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocationHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get('/admin/allocation-history', {
        params: { limit: 50 }
      });
      setAllocationHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch allocation history:', error);
      setAllocationHistory([]);
    }
    setLoadingHistory(false);
  };

  // Fetch specialist task statistics
  const fetchSpecialistTaskStats = async () => {
    try {
      const response = await api.get('/admin/specialist-task-stats');
      setSpecialistTaskStats(response.data || []);
    } catch (error) {
      console.error('Failed to fetch specialist task stats:', error);
      setSpecialistTaskStats([]);
    }
  };

  // Fetch workflow tasks for Workflow Config tab
  const fetchWorkflowTasks = async () => {
    setLoadingWorkflow(true);
    try {
      const data = await getWorkflowTasks();
      setWorkflowTasks(data || []);
    } catch (error) {
      console.error('Failed to fetch workflow tasks:', error);
      setWorkflowTasks([]);
    }
    setLoadingWorkflow(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Fetch allocation history and task stats when allocation tab is active
  useEffect(() => {
    if (activeTab === 'allocation' && isAuthenticated) {
      fetchAllocationHistory();
      fetchSpecialistTaskStats();
    }
  }, [activeTab, isAuthenticated]);

  // Fetch workflow tasks when workflow tab is active
  useEffect(() => {
    if (activeTab === 'workflow' && isAuthenticated) {
      fetchWorkflowTasks();
    }
  }, [activeTab, isAuthenticated]);

  // D3 Network Graph - Admin -> Specialists -> Phases
  const renderNetworkGraph = useCallback((containerRef, isExpanded = false) => {
    const container = containerRef?.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = isExpanded ? 600 : 450;

    // Clear previous
    d3.select(container).selectAll('*').remove();

    // Skip if container not properly sized yet
    if (width < 100) return;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', isDark ? 'rgba(13, 21, 38, 0.5)' : 'rgba(241, 245, 249, 0.5)')
      .style('border-radius', '12px');

    // Filter specialists with valid specialty_type
    const validSpecialists = specialists.filter(s =>
      s.specialty_type && SPECIALTY_TYPES.includes(s.specialty_type)
    );

    // Show message if no valid specialists
    if (!validSpecialists.length) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#64748b' : '#94a3b8')
        .attr('font-size', '16px')
        .text('No specialists with assigned phases');
      return;
    }

    // Get unique phases that have specialists
    const activePhases = [...new Set(validSpecialists.map(s => s.specialty_type))];

    const centerX = width / 2;
    const centerY = height / 2;
    const specialistRadius = isExpanded ? 140 : 100;
    const phaseRadius = isExpanded ? 260 : 190;

    // Create Admin node at center
    const adminNode = {
      id: 'admin',
      name: 'Admin',
      type: 'admin',
      x: centerX,
      y: centerY,
      fx: centerX, // Fixed position
      fy: centerY,
    };

    // Create specialist nodes in middle ring
    const specialistNodes = validSpecialists.map((s, i) => {
      const angle = (i / validSpecialists.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: `specialist-${s.id}`,
        name: s.full_name,
        specialty: s.specialty_type,
        role: s.role,
        type: 'specialist',
        taskCount: (s.pending_tasks_count || 0) + (s.in_progress_tasks_count || 0),
        x: centerX + specialistRadius * Math.cos(angle),
        y: centerY + specialistRadius * Math.sin(angle),
      };
    });

    // Create phase nodes in outer ring
    const phaseNodes = activePhases.map((phase, i) => {
      const angle = (i / activePhases.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: `phase-${phase}`,
        name: phase.replace('_', ' '),
        type: 'phase',
        x: centerX + phaseRadius * Math.cos(angle),
        y: centerY + phaseRadius * Math.sin(angle),
      };
    });

    const nodes = [adminNode, ...specialistNodes, ...phaseNodes];

    // Create links: Admin -> all specialists, Specialists -> their phases
    const adminToSpecialistLinks = validSpecialists.map(s => ({
      source: 'admin',
      target: `specialist-${s.id}`,
      type: 'admin-specialist',
    }));

    const specialistToPhaseLinks = validSpecialists.map(s => ({
      source: `specialist-${s.id}`,
      target: `phase-${s.specialty_type}`,
      type: 'specialist-phase',
      value: (s.pending_tasks_count || 0) + (s.in_progress_tasks_count || 0) + 1,
    }));

    const links = [...adminToSpecialistLinks, ...specialistToPhaseLinks];

    // Color scales
    const adminColor = isDark ? '#f472b6' : '#ec4899';
    const specialistColor = isDark ? '#a78bfa' : '#8b5cf6';
    const phaseColor = isDark ? '#60a5fa' : '#3b82f6';
    const adminLinkColor = isDark ? 'rgba(244, 114, 182, 0.4)' : 'rgba(236, 72, 153, 0.3)';
    const phaseLinkColor = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    // Calculate max task count for scaling node sizes
    const maxTaskCount = Math.max(...validSpecialists.map(s => (s.pending_tasks_count || 0) + (s.in_progress_tasks_count || 0)), 1);

    // Function to get node radius based on task count
    const getNodeRadius = (d) => {
      if (d.type === 'admin') return isExpanded ? 40 : 32;
      if (d.type === 'phase') return isExpanded ? 28 : 22;
      // Specialist: scale between min and max based on task count
      const minRadius = isExpanded ? 18 : 14;
      const maxRadius = isExpanded ? 38 : 30;
      const taskCount = d.taskCount || 0;
      const scale = maxTaskCount > 0 ? taskCount / maxTaskCount : 0;
      return minRadius + (maxRadius - minRadius) * scale;
    };

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
        if (d.type === 'admin-specialist') return isExpanded ? 140 : 110;
        return isExpanded ? 110 : 80;
      }).strength(0.8))
      .force('charge', d3.forceManyBody().strength(isExpanded ? -300 : -220))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 8))
      .force('x', d3.forceX(centerX).strength(0.05))
      .force('y', d3.forceY(centerY).strength(0.05));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.type === 'admin-specialist' ? adminLinkColor : phaseLinkColor)
      .attr('stroke-width', d => d.type === 'admin-specialist' ? 2 : Math.min((d.value || 1) + 1, 5))
      .attr('stroke-dasharray', d => d.type === 'admin-specialist' ? '5,3' : 'none');

    // Create tooltip div
    d3.select(container).selectAll('.node-tooltip').remove();
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'node-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', isDark ? 'rgba(17, 34, 64, 0.95)' : 'rgba(255, 255, 255, 0.95)')
      .style('border', `1px solid ${isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.3)'}`)
      .style('border-radius', '12px')
      .style('padding', '14px 18px')
      .style('box-shadow', '0 10px 40px rgba(0,0,0,0.3)')
      .style('z-index', '100')
      .style('pointer-events', 'none')
      .style('min-width', '180px')
      .style('backdrop-filter', 'blur(10px)');

    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();

        // Build tooltip content based on node type
        let content = '';
        if (d.type === 'admin') {
          content = `
            <div style="font-weight: 700; font-size: 14px; color: ${isDark ? '#f472b6' : '#ec4899'}; margin-bottom: 8px;">
              Admin
            </div>
            <div style="font-size: 12px; color: ${isDark ? '#94a3b8' : '#64748b'};">
              Total Specialists: ${validSpecialists.length}
            </div>
            <div style="font-size: 12px; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-top: 4px;">
              Active Phases: ${activePhases.length}
            </div>
          `;
        } else if (d.type === 'specialist') {
          const specialist = validSpecialists.find(s => s.id === parseInt(d.id.replace('specialist-', '')));
          const pendingTasks = specialist?.pending_tasks_count || 0;
          const inProgressTasks = specialist?.in_progress_tasks_count || 0;
          content = `
            <div style="font-weight: 700; font-size: 14px; color: ${isDark ? '#a78bfa' : '#8b5cf6'}; margin-bottom: 8px;">
              ${d.name}
            </div>
            <div style="font-size: 12px; color: ${isDark ? '#e2e8f0' : '#1e293b'}; margin-bottom: 6px;">
              Phase: <span style="color: ${isDark ? '#60a5fa' : '#3b82f6'}; font-weight: 600;">${d.specialty?.replace('_', ' ')}</span>
            </div>
            <div style="display: flex; gap: 16px; margin-top: 8px;">
              <div>
                <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${pendingTasks}</div>
                <div style="font-size: 10px; color: ${isDark ? '#64748b' : '#94a3b8'};">Pending</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: 700; color: #3b82f6;">${inProgressTasks}</div>
                <div style="font-size: 10px; color: ${isDark ? '#64748b' : '#94a3b8'};">In Progress</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: 700; color: #10b981;">${pendingTasks + inProgressTasks}</div>
                <div style="font-size: 10px; color: ${isDark ? '#64748b' : '#94a3b8'};">Total</div>
              </div>
            </div>
          `;
        } else if (d.type === 'phase') {
          const phaseSpecialists = validSpecialists.filter(s => s.specialty_type === d.name.replace(' ', '_').toUpperCase());
          const totalPending = phaseSpecialists.reduce((sum, s) => sum + (s.pending_tasks_count || 0), 0);
          const totalInProgress = phaseSpecialists.reduce((sum, s) => sum + (s.in_progress_tasks_count || 0), 0);
          content = `
            <div style="font-weight: 700; font-size: 14px; color: ${isDark ? '#60a5fa' : '#3b82f6'}; margin-bottom: 8px;">
              ${d.name}
            </div>
            <div style="font-size: 12px; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-bottom: 6px;">
              Specialists: ${phaseSpecialists.length}
            </div>
            <div style="display: flex; gap: 16px; margin-top: 8px;">
              <div>
                <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${totalPending}</div>
                <div style="font-size: 10px; color: ${isDark ? '#64748b' : '#94a3b8'};">Pending</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: 700; color: #3b82f6;">${totalInProgress}</div>
                <div style="font-size: 10px; color: ${isDark ? '#64748b' : '#94a3b8'};">In Progress</div>
              </div>
            </div>
          `;
        }

        // Position and show tooltip
        const containerRect = container.getBoundingClientRect();
        const svgRect = svg.node().getBoundingClientRect();
        const xPos = d.x + (svgRect.left - containerRect.left);
        const yPos = d.y + (svgRect.top - containerRect.top);

        tooltip
          .html(content)
          .style('left', `${xPos + getNodeRadius(d) + 10}px`)
          .style('top', `${yPos - 20}px`)
          .style('visibility', 'visible');
      })
      .call(d3.drag()
        .on('start', (event, d) => {
          if (d.type === 'admin') return; // Don't drag admin
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          if (d.type === 'admin') return;
          d.fx = event.x;
          d.fy = event.y;
          tooltip.style('visibility', 'hidden'); // Hide tooltip while dragging
        })
        .on('end', (event, d) => {
          if (d.type === 'admin') return;
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Click on SVG background to hide tooltip
    svg.on('click', () => {
      tooltip.style('visibility', 'hidden');
    });

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => {
        if (d.type === 'admin') return adminColor;
        if (d.type === 'phase') return phaseColor;
        return specialistColor;
      })
      .attr('stroke', isDark ? '#1e293b' : '#ffffff')
      .attr('stroke-width', d => d.type === 'admin' ? 3 : 2)
      .style('filter', d => d.type === 'admin'
        ? 'drop-shadow(0 4px 8px rgba(236, 72, 153, 0.4))'
        : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))');

    // Add labels below nodes
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d) + (isExpanded ? 14 : 12))
      .attr('fill', textColor)
      .attr('font-size', d => d.type === 'admin' ? (isExpanded ? '12px' : '10px') : (isExpanded ? '10px' : '8px'))
      .attr('font-weight', '600')
      .text(d => {
        const maxLen = isExpanded ? 12 : 9;
        return d.name.length > maxLen ? d.name.substring(0, maxLen) + '...' : d.name;
      });

    // Add text inside admin node
    node.filter(d => d.type === 'admin')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 6)
      .attr('fill', '#ffffff')
      .attr('font-size', isExpanded ? '16px' : '14px')
      .attr('font-weight', '800')
      .text('A');

    // Add task count for specialists (font size scales with node size)
    node.filter(d => d.type === 'specialist')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#ffffff')
      .attr('font-size', d => {
        const radius = getNodeRadius(d);
        return `${Math.max(10, Math.min(radius * 0.6, 18))}px`;
      })
      .attr('font-weight', '700')
      .text(d => d.taskCount);

    // Add first letter for phases
    node.filter(d => d.type === 'phase')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#ffffff')
      .attr('font-size', isExpanded ? '12px' : '10px')
      .attr('font-weight', '700')
      .text(d => d.name.charAt(0));

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }, [specialists, isDark]);

  // D3 Stacked Bar Chart - Workload by Phase
  const renderBarChart = useCallback(() => {
    if (!barChartRef.current || !workload?.by_specialty) return;

    const container = barChartRef.current;
    const width = container.clientWidth;
    const height = 300;
    const margin = { top: 30, right: 20, bottom: 80, left: 50 };

    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const data = Object.entries(workload.by_specialty).map(([phase, counts]) => ({
      phase: phase.replace('_', ' '),
      pending: counts.pending || 0,
      inProgress: counts.in_progress || 0,
      completed: counts.completed || 0,
    }));

    const keys = ['completed', 'inProgress', 'pending']; // Order: bottom to top
    const colorScale = {
      pending: '#f59e0b',
      inProgress: '#3b82f6',
      completed: '#10b981',
    };

    // Create stacked data
    const stack = d3.stack().keys(keys);
    const stackedData = stack(data);

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.phase))
      .rangeRound([margin.left, width - margin.right])
      .padding(0.3);

    // Y scale - based on max total
    const maxTotal = d3.max(data, d => d.pending + d.inProgress + d.completed) || 10;
    const y = d3.scaleLinear()
      .domain([0, maxTotal])
      .nice()
      .rangeRound([height - margin.bottom, margin.top]);

    // Draw stacked bars
    const barGroups = svg.append('g')
      .selectAll('g')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('fill', d => colorScale[d.key]);

    barGroups.selectAll('rect')
      .data(d => d.map(item => ({ ...item, key: d.key })))
      .enter()
      .append('rect')
      .attr('x', d => x(d.data.phase))
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('rx', 4);

    // Add numbers inside each segment
    barGroups.selectAll('text')
      .data(d => d.map(item => ({ ...item, key: d.key })))
      .enter()
      .append('text')
      .attr('x', d => x(d.data.phase) + x.bandwidth() / 2)
      .attr('y', d => {
        const segmentHeight = y(d[0]) - y(d[1]);
        return y(d[1]) + segmentHeight / 2 + 4;
      })
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => {
        const value = d[1] - d[0];
        const segmentHeight = y(d[0]) - y(d[1]);
        return value > 0 && segmentHeight > 15 ? value : '';
      });

    // Add total on top of each bar
    svg.append('g')
      .selectAll('text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.phase) + x.bandwidth() / 2)
      .attr('y', d => y(d.pending + d.inProgress + d.completed) - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .text(d => {
        const total = d.pending + d.inProgress + d.completed;
        return total > 0 ? total : '';
      });

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '10px');

    svg.selectAll('.domain, .tick line').attr('stroke', isDark ? '#334155' : '#e2e8f0');

    // Y axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('fill', isDark ? '#94a3b8' : '#64748b');

    // Legend - positioned at bottom center
    const legendItems = [
      { key: 'pending', label: 'Pending' },
      { key: 'inProgress', label: 'In Progress' },
      { key: 'completed', label: 'Completed' },
    ];
    const legendWidth = 280;
    const legend = svg.append('g')
      .attr('transform', `translate(${(width - legendWidth) / 2}, ${height - 25})`);

    legendItems.forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 95}, 0)`);
      g.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colorScale[item.key])
        .attr('rx', 2);
      g.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '11px')
        .text(item.label);
    });
  }, [workload, isDark]);

  // D3 Donut Chart - Task Status Distribution
  const renderDonutChart = useCallback(() => {
    if (!donutChartRef.current || !workload?.by_specialty) return;

    const container = donutChartRef.current;
    const width = container.clientWidth;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const totalPending = Object.values(workload.by_specialty).reduce((sum, s) => sum + (s.pending || 0), 0);
    const totalInProgress = Object.values(workload.by_specialty).reduce((sum, s) => sum + (s.in_progress || 0), 0);
    const totalCompleted = Object.values(workload.by_specialty).reduce((sum, s) => sum + (s.completed || 0), 0);

    const data = [
      { label: 'Pending', value: totalPending, color: '#f59e0b' },
      { label: 'In Progress', value: totalInProgress, color: '#3b82f6' },
      { label: 'Completed', value: totalCompleted, color: '#10b981' },
    ].filter(d => d.value > 0);

    if (data.length === 0) {
      svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#64748b' : '#94a3b8')
        .text('No data available');
      return;
    }

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.8).outerRadius(radius * 0.8);

    const arcs = svg.selectAll('arc')
      .data(pie(data))
      .enter()
      .append('g');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', isDark ? '#0d1526' : '#ffffff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))');

    // Labels
    arcs.append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text(d => d.data.value);

    // Center text
    const total = totalPending + totalInProgress + totalCompleted;
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '24px')
      .attr('font-weight', '700')
      .text(total);

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('fill', isDark ? '#64748b' : '#94a3b8')
      .attr('font-size', '12px')
      .text('Total Tasks');

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${radius + 20}, ${-data.length * 12})`);

    data.forEach((d, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 24})`);
      g.append('circle')
        .attr('r', 6)
        .attr('fill', d.color);
      g.append('text')
        .attr('x', 14)
        .attr('y', 4)
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '11px')
        .text(d.label);
    });
  }, [workload, isDark]);

  // D3 Sankey-like Flow Diagram
  const renderSankeyDiagram = useCallback(() => {
    if (!sankeyRef.current || !workload?.by_specialty) return;

    const container = sankeyRef.current;
    const width = container.clientWidth;
    const height = 350;
    const margin = { top: 30, right: 30, bottom: 30, left: 30 };

    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create flow stages
    const phases = SPECIALTY_TYPES;
    const stageWidth = (width - margin.left - margin.right) / phases.length;

    const data = phases.map((phase, i) => {
      const phaseData = workload.by_specialty[phase] || { pending: 0, in_progress: 0, completed: 0 };
      const total = (phaseData.pending || 0) + (phaseData.in_progress || 0);
      return {
        phase,
        label: phase.replace('_', ' '),
        total,
        pending: phaseData.pending || 0,
        inProgress: phaseData.in_progress || 0,
        completed: phaseData.completed || 0,
        x: margin.left + i * stageWidth + stageWidth / 2,
      };
    });

    const maxTotal = Math.max(...data.map(d => d.total), 1);
    const nodeHeight = d => Math.max((d.total / maxTotal) * 150, 30);

    // Draw flow connections
    const flowGroup = svg.append('g');

    for (let i = 0; i < data.length - 1; i++) {
      const source = data[i];
      const target = data[i + 1];
      const sourceHeight = nodeHeight(source);
      const targetHeight = nodeHeight(target);
      const sourceY = height / 2;
      const targetY = height / 2;

      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', `flow-gradient-${i}`)
        .attr('x1', '0%')
        .attr('x2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', 0.6);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#06b6d4')
        .attr('stop-opacity', 0.6);

      const flowPath = d3.path();
      flowPath.moveTo(source.x + 25, sourceY - sourceHeight / 4);
      flowPath.bezierCurveTo(
        source.x + stageWidth / 2, sourceY - sourceHeight / 4,
        target.x - stageWidth / 2, targetY - targetHeight / 4,
        target.x - 25, targetY - targetHeight / 4
      );
      flowPath.lineTo(target.x - 25, targetY + targetHeight / 4);
      flowPath.bezierCurveTo(
        target.x - stageWidth / 2, targetY + targetHeight / 4,
        source.x + stageWidth / 2, sourceY + sourceHeight / 4,
        source.x + 25, sourceY + sourceHeight / 4
      );
      flowPath.closePath();

      flowGroup.append('path')
        .attr('d', flowPath.toString())
        .attr('fill', `url(#flow-gradient-${i})`)
        .attr('opacity', Math.min(source.total / maxTotal + 0.3, 0.8));
    }

    // Draw phase nodes
    const nodeGroup = svg.append('g');

    data.forEach((d, i) => {
      const nodeH = nodeHeight(d);
      const y = height / 2;

      // Node rectangle
      const nodeGradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', `node-gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      nodeGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d.total > 0 ? '#3b82f6' : (isDark ? '#334155' : '#cbd5e1'));

      nodeGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d.total > 0 ? '#1d4ed8' : (isDark ? '#1e293b' : '#94a3b8'));

      nodeGroup.append('rect')
        .attr('x', d.x - 25)
        .attr('y', y - nodeH / 2)
        .attr('width', 50)
        .attr('height', nodeH)
        .attr('rx', 8)
        .attr('fill', `url(#node-gradient-${i})`)
        .attr('stroke', isDark ? '#60a5fa' : '#3b82f6')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))');

      // Count text
      nodeGroup.append('text')
        .attr('x', d.x)
        .attr('y', y + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .text(d.total);

      // Phase label
      nodeGroup.append('text')
        .attr('x', d.x)
        .attr('y', y + nodeH / 2 + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .text(d.label.length > 10 ? d.label.substring(0, 10) + '...' : d.label);
    });

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Workflow Pipeline Flow');
  }, [workload, isDark]);

  // Render D3 visualizations when tab is analytics
  useEffect(() => {
    if (activeTab === 'analytics' && !loading) {
      // Initial render with delay to ensure DOM is ready
      const timer1 = setTimeout(() => {
        renderNetworkGraph(networkGraphRef, false);
        renderBarChart();
        renderDonutChart();
        renderSankeyDiagram();
      }, 200);

      // Retry render to handle any timing issues
      const timer2 = setTimeout(() => {
        renderNetworkGraph(networkGraphRef, false);
        renderBarChart();
        renderDonutChart();
        renderSankeyDiagram();
      }, 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [activeTab, loading, specialists, workload, renderNetworkGraph, renderBarChart, renderDonutChart, renderSankeyDiagram]);

  // Re-render on window resize
  useEffect(() => {
    const handleResize = () => {
      if (activeTab === 'analytics') {
        renderNetworkGraph(networkGraphRef, false);
        renderBarChart();
        renderDonutChart();
        renderSankeyDiagram();
      }
      if (expandedChart === 'network') {
        renderNetworkGraph(networkGraphExpandedRef, true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, expandedChart, renderNetworkGraph, renderBarChart, renderDonutChart, renderSankeyDiagram]);

  // Render expanded network graph
  useEffect(() => {
    if (expandedChart === 'network') {
      const timer = setTimeout(() => {
        renderNetworkGraph(networkGraphExpandedRef, true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expandedChart, renderNetworkGraph]);

  // Colors definition - moved before render functions that use it
  const colors = {
    primary: '#117ACA',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    orange: '#f97316',
    indigo: '#6366f1',
    lightBlue: '#60a5fa',
    chaseBlue: '#0a4b94',
    chaseBlueLight: '#1a6fc9',
  };

  // Allocation Analytics - Reasons Donut Chart
  const renderReasonsChart = useCallback(() => {
    if (!reasonsChartRef.current || !allocationHistory.length) return;

    const container = reasonsChartRef.current;
    const width = container.clientWidth || 300;
    const height = 280;
    const radius = Math.min(width, height) / 2 - 20;

    d3.select(container).selectAll('*').remove();

    // Aggregate reasons
    const reasonCounts = {};
    allocationHistory.forEach(event => {
      if (event.reason) {
        reasonCounts[event.reason] = (reasonCounts[event.reason] || 0) + 1;
      } else {
        reasonCounts['No Reason'] = (reasonCounts['No Reason'] || 0) + 1;
      }
    });

    const data = Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      count,
    })).sort((a, b) => b.count - a.count);

    if (!data.length) return;

    const reasonColors = {
      'Sick Leave': '#ef4444',
      'Vacation / PTO': '#f59e0b',
      'Training Session': '#8b5cf6',
      'Extended Meeting': '#06b6d4',
      'Workload Balancing': '#10b981',
      'Personal Emergency': '#ec4899',
      'Other Reason': '#64748b',
      'No Reason': '#475569',
    };

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => reasonColors[d.data.reason] || '#64748b')
      .attr('stroke', isDark ? '#0f172a' : '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0.9);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', isDark ? '#f1f5f9' : '#1e293b')
      .attr('font-size', '24px')
      .attr('font-weight', '700')
      .text(allocationHistory.length);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', isDark ? '#64748b' : '#94a3b8')
      .attr('font-size', '12px')
      .text('Total Events');

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(10, ${height - data.length * 18 - 10})`);

    data.slice(0, 5).forEach((d, i) => {
      const row = legend.append('g')
        .attr('transform', `translate(0, ${i * 18})`);

      row.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', reasonColors[d.reason] || '#64748b');

      row.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '11px')
        .text(`${d.reason} (${d.count})`);
    });
  }, [allocationHistory, isDark]);

  // Allocation Analytics - Specialist Bar Chart
  const renderSpecialistChart = useCallback(() => {
    if (!specialistChartRef.current || !allocationHistory.length) return;

    const container = specialistChartRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;
    const margin = { top: 10, right: 40, bottom: 10, left: 90 };

    d3.select(container).selectAll('*').remove();

    // Aggregate by specialist
    const specialistCounts = {};
    allocationHistory.forEach(event => {
      const name = event.specialist_name || 'Unknown';
      specialistCounts[name] = (specialistCounts[name] || 0) + 1;
    });

    const data = Object.entries(specialistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    if (!data.length) return;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.25);

    // Bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', margin.left)
      .attr('y', d => y(d.name))
      .attr('width', d => x(d.count) - margin.left)
      .attr('height', y.bandwidth())
      .attr('fill', colors.chaseBlue)
      .attr('rx', 4)
      .style('opacity', 0.85);

    // Values
    svg.selectAll('.value')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.count) + 6)
      .attr('y', d => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => d.count);

    // Y axis labels
    svg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', margin.left - 6)
      .attr('y', d => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .text(d => d.name.length > 10 ? d.name.slice(0, 10) + '..' : d.name);
  }, [allocationHistory, isDark, colors.chaseBlue]);

  // Allocation Analytics - Timeline Chart with Drill-Down
  const renderTimelineChart = useCallback(() => {
    if (!timelineChartRef.current || !allocationHistory.length) return;

    const container = timelineChartRef.current;
    const width = container.clientWidth || 600;
    const height = 220;
    const margin = { top: 45, right: 30, bottom: 55, left: 50 };

    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Gradient for bars
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'timelineBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colors.chaseBlue);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colors.chaseBlueLight);

    // Helper functions
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const getWeekOfMonth = (date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
    };

    // Filter data based on drill selection
    let filteredData = allocationHistory;
    if (timelineDrillSelection) {
      filteredData = allocationHistory.filter(event => {
        const eventDate = new Date(event.created_at);
        if (timelineDrillLevel === 'week' && timelineDrillSelection.year !== undefined && timelineDrillSelection.month !== undefined) {
          return eventDate.getFullYear() === timelineDrillSelection.year &&
                 eventDate.getMonth() === timelineDrillSelection.month;
        }
        if (timelineDrillLevel === 'day' && timelineDrillSelection.weekStart) {
          const weekStart = new Date(timelineDrillSelection.weekStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return eventDate >= weekStart && eventDate < weekEnd;
        }
        if (timelineDrillLevel === 'hour' && timelineDrillSelection.date) {
          const selDate = new Date(timelineDrillSelection.date);
          return eventDate.getFullYear() === selDate.getFullYear() &&
                 eventDate.getMonth() === selDate.getMonth() &&
                 eventDate.getDate() === selDate.getDate();
        }
        return true;
      });
    }

    // Get title and breadcrumb based on drill level
    let title = 'Monthly Overview';
    let breadcrumb = '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (timelineDrillLevel === 'week' && timelineDrillSelection) {
      title = `Weekly - ${monthNames[timelineDrillSelection.month]} ${timelineDrillSelection.year}`;
      breadcrumb = 'Months';
    } else if (timelineDrillLevel === 'day' && timelineDrillSelection) {
      const ws = new Date(timelineDrillSelection.weekStart);
      title = `Daily - Week of ${monthNames[ws.getMonth()]} ${ws.getDate()}`;
      breadcrumb = 'Weeks';
    } else if (timelineDrillLevel === 'hour' && timelineDrillSelection) {
      const d = new Date(timelineDrillSelection.date);
      title = `Hourly - ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      breadcrumb = 'Days';
    }

    // Back button for drill-down
    if (timelineDrillLevel !== 'month') {
      const backBtn = svg.append('g')
        .attr('transform', `translate(15, 20)`)
        .style('cursor', 'pointer')
        .on('click', () => {
          if (timelineDrillLevel === 'week') {
            setTimelineDrillLevel('month');
            setTimelineDrillSelection(null);
          } else if (timelineDrillLevel === 'day') {
            setTimelineDrillLevel('week');
            setTimelineDrillSelection({
              year: timelineDrillSelection.year,
              month: timelineDrillSelection.month
            });
          } else if (timelineDrillLevel === 'hour') {
            const d = new Date(timelineDrillSelection.date);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            setTimelineDrillLevel('day');
            setTimelineDrillSelection({
              year: d.getFullYear(),
              month: d.getMonth(),
              weekStart: weekStart.toISOString()
            });
          }
        });

      backBtn.append('rect')
        .attr('x', -5)
        .attr('y', -12)
        .attr('width', 70)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');

      backBtn.append('text')
        .attr('fill', colors.chaseBlue)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(`← ${breadcrumb}`);
    }

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text(title);

    // Subtitle hint
    if (timelineDrillLevel !== 'hour') {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#64748b' : '#94a3b8')
        .attr('font-size', '10px')
        .text('Click a bar to drill down');
    }

    let data = [];

    // MONTH level - group by month
    if (timelineDrillLevel === 'month') {
      const monthCounts = {};
      filteredData.forEach(event => {
        const d = new Date(event.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      });

      data = Object.entries(monthCounts)
        .map(([key, count]) => {
          const [year, month] = key.split('-').map(Number);
          return { year, month, count, label: `${monthNames[month]} ${year}` };
        })
        .sort((a, b) => a.year - b.year || a.month - b.month);
    }
    // WEEK level - group by week of month
    else if (timelineDrillLevel === 'week') {
      const weekCounts = {};
      filteredData.forEach(event => {
        const d = new Date(event.created_at);
        const weekOfMonth = getWeekOfMonth(d);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split('T')[0];
        if (!weekCounts[key]) {
          weekCounts[key] = { count: 0, weekOfMonth, weekStart };
        }
        weekCounts[key].count += 1;
      });

      data = Object.entries(weekCounts)
        .map(([key, { count, weekOfMonth, weekStart }]) => ({
          weekStart,
          count,
          label: `Week ${weekOfMonth}`,
          year: timelineDrillSelection?.year,
          month: timelineDrillSelection?.month
        }))
        .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    }
    // DAY level - group by day
    else if (timelineDrillLevel === 'day') {
      const dayCounts = {};
      filteredData.forEach(event => {
        const d = new Date(event.created_at);
        const key = d.toISOString().split('T')[0];
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      });

      data = Object.entries(dayCounts)
        .map(([key, count]) => {
          const d = new Date(key);
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return { date: key, count, label: `${dayNames[d.getDay()]} ${d.getDate()}` };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    // HOUR level - group by hour
    else if (timelineDrillLevel === 'hour') {
      const hourCounts = {};
      for (let i = 0; i < 24; i++) hourCounts[i] = 0;

      filteredData.forEach(event => {
        const hour = new Date(event.created_at).getHours();
        hourCounts[hour] += 1;
      });

      // Filter to hours with activity and padding
      const activeHours = Object.keys(hourCounts).filter(h => hourCounts[h] > 0).map(Number);
      const minHour = Math.max(0, Math.min(...activeHours) - 1);
      const maxHour = Math.min(23, Math.max(...activeHours) + 1);

      data = [];
      for (let h = minHour; h <= maxHour; h++) {
        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        data.push({ hour: h, count: hourCounts[h], label: `${hour12}${ampm}` });
      }
    }

    if (data.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#64748b' : '#94a3b8')
        .attr('font-size', '14px')
        .text('No data for this period');
      return;
    }

    // Scales
    const x = d3.scaleBand()
      .domain(data.map((_, i) => i))
      .range([margin.left, width - margin.right])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d, i) => x(i))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => height - margin.bottom - y(d.count))
      .attr('fill', 'url(#timelineBarGradient)')
      .attr('rx', 4)
      .style('opacity', d => d.count > 0 ? 0.9 : 0.3)
      .style('cursor', timelineDrillLevel !== 'hour' ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (timelineDrillLevel === 'month') {
          setTimelineDrillLevel('week');
          setTimelineDrillSelection({ year: d.year, month: d.month });
        } else if (timelineDrillLevel === 'week') {
          setTimelineDrillLevel('day');
          setTimelineDrillSelection({
            year: d.year,
            month: d.month,
            weekStart: d.weekStart
          });
        } else if (timelineDrillLevel === 'day') {
          setTimelineDrillLevel('hour');
          setTimelineDrillSelection({ date: d.date });
        }
      })
      .on('mouseover', function() {
        if (timelineDrillLevel !== 'hour') {
          d3.select(this).style('opacity', 1);
        }
      })
      .on('mouseout', function(event, d) {
        d3.select(this).style('opacity', d.count > 0 ? 0.9 : 0.3);
      });

    // Value labels on bars
    svg.selectAll('.value')
      .data(data.filter(d => d.count > 0))
      .enter()
      .append('text')
      .attr('x', (d, i) => {
        const idx = data.findIndex(item => item === d);
        return x(idx) + x.bandwidth() / 2;
      })
      .attr('y', d => y(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .text(d => d.count);

    // X axis labels
    svg.selectAll('.xlabel')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d, i) => x(i) + x.bandwidth() / 2)
      .attr('y', height - margin.bottom + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '11px')
      .text(d => d.label);

    // Y axis
    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
      .attr('color', isDark ? '#64748b' : '#94a3b8')
      .selectAll('text')
      .attr('font-size', '10px');

  }, [allocationHistory, isDark, colors.chaseBlue, colors.chaseBlueLight, timelineDrillLevel, timelineDrillSelection]);

  // Allocation Analytics - Event Type Distribution
  const renderEventTypeChart = useCallback(() => {
    if (!flowChartRef.current || !allocationHistory.length) return;

    const container = flowChartRef.current;
    const width = container.clientWidth || 300;
    const height = 200;

    d3.select(container).selectAll('*').remove();

    // Aggregate by event type
    const typeCounts = {};
    allocationHistory.forEach(event => {
      typeCounts[event.event_type] = (typeCounts[event.event_type] || 0) + 1;
    });

    const data = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      label: type === 'MOVED_TO_UNALLOCATED' ? 'Out of Office' :
             type === 'TASK_REASSIGNMENT' ? 'Task Reassigned' :
             type === 'REALLOCATION' ? 'Phase Change' :
             type === 'PHASE_TRANSFER' ? 'Phase Transfer' :
             type === 'DUAL_PHASE_REMOVED' ? 'Dual Removed' :
             type === 'INITIAL_ALLOCATION' ? 'Initial Alloc' : type,
    }));

    const typeColors = {
      'MOVED_TO_UNALLOCATED': colors.orange,
      'TASK_REASSIGNMENT': colors.chaseBlue,
      'REALLOCATION': colors.success,
      'PHASE_TRANSFER': '#185FA5',
      'DUAL_PHASE_REMOVED': '#ef4444',
      'INITIAL_ALLOCATION': '#8b5cf6',
    };

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const total = d3.sum(data, d => d.count);
    let currentX = 20;

    data.forEach((d, i) => {
      const barWidth = ((d.count / total) * (width - 40));

      svg.append('rect')
        .attr('x', currentX)
        .attr('y', 60)
        .attr('width', barWidth - 4)
        .attr('height', 40)
        .attr('rx', 6)
        .attr('fill', typeColors[d.type] || '#64748b');

      svg.append('text')
        .attr('x', currentX + (barWidth - 4) / 2)
        .attr('y', 85)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .text(d.count);

      svg.append('text')
        .attr('x', currentX + (barWidth - 4) / 2)
        .attr('y', 130)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '11px')
        .text(d.label);

      // Percentage
      svg.append('text')
        .attr('x', currentX + (barWidth - 4) / 2)
        .attr('y', 150)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#64748b' : '#94a3b8')
        .attr('font-size', '10px')
        .text(`${Math.round((d.count / total) * 100)}%`);

      currentX += barWidth;
    });

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text('Event Type Distribution');
  }, [allocationHistory, isDark, colors]);

  // Allocation Analytics - Tasks Completed by Specialist
  const renderTasksCompletedChart = useCallback(() => {
    if (!tasksCompletedChartRef.current || !specialistTaskStats.length) return;

    const container = tasksCompletedChartRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;
    const margin = { top: 10, right: 40, bottom: 10, left: 90 };

    d3.select(container).selectAll('*').remove();

    // Filter to top 6 specialists by completed tasks (fewer for compact view)
    const data = specialistTaskStats.slice(0, 6);

    if (data.length === 0) {
      // Show empty state
      const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', height);

      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#64748b' : '#94a3b8')
        .attr('font-size', '12px')
        .text('No task data available');
      return;
    }

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Scales
    const maxCompleted = d3.max(data, d => d.completed_count) || 1;
    const x = d3.scaleLinear()
      .domain([0, maxCompleted])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.full_name || d.username))
      .range([margin.top, height - margin.bottom])
      .padding(0.25);

    // Gradient for bars
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'tasksCompletedGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#22c55e');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#16a34a');

    // Draw bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', margin.left)
      .attr('y', d => y(d.full_name || d.username))
      .attr('width', d => Math.max(0, x(d.completed_count) - margin.left))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', 'url(#tasksCompletedGradient)')
      .attr('opacity', 0.9);

    // Y axis labels (specialist names) - truncate to fit
    svg.selectAll('.name')
      .data(data)
      .enter()
      .append('text')
      .attr('x', margin.left - 6)
      .attr('y', d => y(d.full_name || d.username) + y.bandwidth() / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .text(d => {
        const name = d.full_name || d.username;
        return name.length > 10 ? name.substring(0, 10) + '..' : name;
      });

    // Value labels on bars
    svg.selectAll('.value')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.completed_count) + 6)
      .attr('y', d => y(d.full_name || d.username) + y.bandwidth() / 2 + 3)
      .attr('text-anchor', 'start')
      .attr('fill', isDark ? '#22c55e' : '#16a34a')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text(d => d.completed_count);

    // In-progress indicators (small badges) - only show if space allows
    const inProgressData = data.filter(d => d.in_progress_count > 0 && x(d.completed_count) + 30 < width - margin.right);
    svg.selectAll('.in-progress')
      .data(inProgressData)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${Math.min(x(d.completed_count) + 28, width - margin.right - 10)}, ${y(d.full_name || d.username) + y.bandwidth() / 2})`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('r', 8)
          .attr('fill', '#fbbf24')
          .attr('opacity', 0.2);
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '3px')
          .attr('fill', '#f59e0b')
          .attr('font-size', '8px')
          .attr('font-weight', '700')
          .text(d.in_progress_count);
      });

  }, [specialistTaskStats, isDark]);

  // Render allocation analytics charts when sub-tab is active
  useEffect(() => {
    if (activeTab === 'allocation' && allocationSubTab === 'analytics') {
      // Initial render with delay to ensure containers are visible
      const timer1 = setTimeout(() => {
        if (allocationHistory.length > 0) {
          renderReasonsChart();
          renderSpecialistChart();
          renderTimelineChart();
          renderEventTypeChart();
        }
        if (specialistTaskStats.length > 0) {
          renderTasksCompletedChart();
        }
      }, 100);

      // Second render attempt for containers that might not be ready
      const timer2 = setTimeout(() => {
        if (allocationHistory.length > 0) {
          renderReasonsChart();
          renderSpecialistChart();
          renderTimelineChart();
          renderEventTypeChart();
        }
        if (specialistTaskStats.length > 0) {
          renderTasksCompletedChart();
        }
      }, 500);

      // Re-render on window resize
      const handleResize = () => {
        if (allocationHistory.length > 0) {
          renderReasonsChart();
          renderSpecialistChart();
          renderTimelineChart();
          renderEventTypeChart();
        }
        if (specialistTaskStats.length > 0) {
          renderTasksCompletedChart();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [activeTab, allocationSubTab, allocationHistory, specialistTaskStats, renderReasonsChart, renderSpecialistChart, renderTimelineChart, renderEventTypeChart, renderTasksCompletedChart]);

  // Re-render timeline when drill level changes
  useEffect(() => {
    if (activeTab === 'allocation' && allocationSubTab === 'analytics' && allocationHistory.length > 0) {
      const timer = setTimeout(() => {
        renderTimelineChart();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [timelineDrillLevel, timelineDrillSelection, activeTab, allocationSubTab, allocationHistory, renderTimelineChart]);

  // Re-render tasks completed chart when data changes
  useEffect(() => {
    if (activeTab === 'allocation' && allocationSubTab === 'analytics' && specialistTaskStats.length > 0) {
      const timer = setTimeout(() => {
        renderTasksCompletedChart();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [specialistTaskStats, activeTab, allocationSubTab, renderTasksCompletedChart]);

  // Reset drill level when switching away from analytics
  useEffect(() => {
    if (allocationSubTab !== 'analytics') {
      setTimelineDrillLevel('month');
      setTimelineDrillSelection(null);
    }
  }, [allocationSubTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingSpecialist(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      specialty_type: 'INTAKE',
      specialty_types: ['INTAKE'],
      role: 'specialist',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (specialist) => {
    setEditingSpecialist(specialist);
    setFormData({
      username: specialist.username,
      password: '',
      full_name: specialist.full_name,
      email: specialist.email || '',
      specialty_type: specialist.specialty_type,
      specialty_types: specialist.specialty_types || (specialist.specialty_type && specialist.specialty_type !== 'NOT_ALLOCATED' ? [specialist.specialty_type] : []),
      role: specialist.role,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);

    // Validate specialty_types
    if (!formData.specialty_types || formData.specialty_types.length === 0) {
      setFormError('Please select at least one specialty type');
      setSaving(false);
      return;
    }

    try {
      if (editingSpecialist) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        delete updateData.username;
        // Ensure specialty_type is set to first specialty_types for backward compatibility
        updateData.specialty_type = updateData.specialty_types[0] || 'NOT_ALLOCATED';
        await api.put(`/admin/specialists/${editingSpecialist.id}`, updateData);
      } else {
        if (!formData.password || formData.password.length < 6) {
          setFormError('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        // Ensure specialty_type is set for backward compatibility
        const saveData = {
          ...formData,
          specialty_type: formData.specialty_types[0] || 'NOT_ALLOCATED',
        };
        await api.post('/admin/specialists', saveData);
      }
      setShowModal(false);
      await fetchData();
    } catch (error) {
      setFormError(error.response?.data?.detail || 'Failed to save specialist');
    }
    setSaving(false);
  };

  const handleDelete = async (specialist) => {
    showDeleteConfirm('specialist', specialist, specialist.full_name, async () => {
      try {
        await api.delete(`/admin/specialists/${specialist.id}`);
        await fetchData();
      } catch (error) {
        console.error('Failed to delete specialist:', error);
      }
    });
  };

  // Show delete confirmation modal
  const showDeleteConfirm = (type, item, itemName, onConfirm) => {
    setDeleteConfirmModal({
      show: true,
      type,
      item,
      itemName,
      onConfirm,
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (deleteConfirmModal.onConfirm) {
      await deleteConfirmModal.onConfirm();
    }
    setDeleteConfirmModal({ show: false, type: '', item: null, itemName: '', onConfirm: null });
  };

  // Cancel delete confirmation
  const handleDeleteCancel = () => {
    setDeleteConfirmModal({ show: false, type: '', item: null, itemName: '', onConfirm: null });
  };

  // Handle specialist allocation change via drag and drop
  const handleAllocationDrop = async (specialistId, newPhase) => {
    const specialist = specialists.find(s => s.id === specialistId);
    if (!specialist) {
      setDraggedSpecialist(null);
      setDragOverBucket(null);
      return;
    }

    // Check if already in same phase (or both unallocated)
    const currentPhase = specialist.specialty_type || 'NOT_ALLOCATED';
    if (currentPhase === newPhase) {
      setDraggedSpecialist(null);
      setDragOverBucket(null);
      return;
    }

    // Validate specialist is allowed in the target phase based on their specialty_types
    const specialistTypes = specialist.specialty_types || [];
    if (newPhase !== 'NOT_ALLOCATED' && specialistTypes.length > 0 && !specialistTypes.includes(newPhase)) {
      setCertificationError({
        specialistName: specialist.full_name || specialist.username,
        targetPhase: newPhase,
        specialtyTypes: specialistTypes,
      });
      setDraggedSpecialist(null);
      setDragOverBucket(null);
      return;
    }

    // Check if moving to a new phase (not NOT_ALLOCATED) with active tasks
    // This triggers the Phase Transfer Modal for multi-certified specialists
    const taskCount = (specialist.pending_tasks_count || 0) + (specialist.in_progress_tasks_count || 0);
    if (newPhase !== 'NOT_ALLOCATED' && taskCount > 0) {
      // Fetch actual tasks for this specialist
      setPhaseTransferLoading(true);
      try {
        const [assignedRes, inProgressRes] = await Promise.all([
          api.get('/tasks', { params: { specialist_id: specialistId, status: 'ASSIGNED' } }),
          api.get('/tasks', { params: { specialist_id: specialistId, status: 'IN_PROGRESS' } }),
        ]);
        const allTasks = [
          ...(assignedRes.data || []),
          ...(inProgressRes.data || []),
        ];

        // Open Phase Transfer Modal
        setPhaseTransferData({
          specialist,
          currentPhase,
          targetPhase: newPhase,
          tasks: allTasks,
        });
        setPhaseTransferStep(1);
        setPhaseTransferOption('reassign');
        setPhaseTransferAssignments({});
        setPhaseTransferModal(true);
      } catch (error) {
        console.error('Failed to fetch specialist tasks:', error);
        // Show toast error
        setToastMessage({ text: 'Failed to load tasks. Please try again.', type: 'error' });
      }
      setPhaseTransferLoading(false);
      setDraggedSpecialist(null);
      setDragOverBucket(null);
      return;
    }

    // If no active tasks, move immediately with toast notification
    if (newPhase !== 'NOT_ALLOCATED' && taskCount === 0) {
      await executeAllocationChange(specialistId, newPhase);
      setToastMessage({
        text: `${specialist.full_name || specialist.username} moved to ${newPhase.replace(/_/g, ' ')}`,
        type: 'success'
      });
      setDraggedSpecialist(null);
      setDragOverBucket(null);
      return;
    }

    // Check if moving to NOT_ALLOCATED with pending tasks
    if (newPhase === 'NOT_ALLOCATED' && taskCount > 0) {
      // Fetch actual tasks for this specialist
      setLoadingTasks(true);
      try {
        // Fetch both ASSIGNED and IN_PROGRESS tasks separately
        const [assignedRes, inProgressRes] = await Promise.all([
          api.get('/tasks', { params: { specialist_id: specialistId, status: 'ASSIGNED' } }),
          api.get('/tasks', { params: { specialist_id: specialistId, status: 'IN_PROGRESS' } }),
        ]);
        const allTasks = [
          ...(assignedRes.data || []),
          ...(inProgressRes.data || []),
        ];
        console.log('Fetched tasks for specialist:', specialistId, allTasks);
        setSpecialistTasks(allTasks);
      } catch (error) {
        console.error('Failed to fetch specialist tasks:', error);
        setSpecialistTasks([]);
      }
      setLoadingTasks(false);

      // Show reallocation modal
      setReallocationData({
        specialist,
        targetPhase: newPhase,
        taskCount,
        currentPhase,
      });
      setReallocationStep(1);
      setTaskReassignments({});
      setReallocationReason('');
      setReallocationModal(true);
      setDraggedSpecialist(null);
      setDragOverBucket(null);
      return;
    }

    // Direct move (no tasks or not moving to NOT_ALLOCATED)
    await executeAllocationChange(specialistId, newPhase);
  };

  // Execute the actual allocation change
  const executeAllocationChange = async (specialistId, newPhase, reassignments = {}, reason = '') => {
    setUpdatingAllocation(true);
    const specialist = specialists.find(s => s.id === specialistId);
    const fromPhase = specialist?.specialty_type || 'NOT_ALLOCATED';

    try {
      // First, reassign tasks to other specialists
      const reassignmentEntries = Object.entries(reassignments);
      for (const [taskId, targetSpecialistId] of reassignmentEntries) {
        try {
          await api.post(`/tasks/${taskId}/assign`, {
            specialist_id: targetSpecialistId,
          });

          // Log task reassignment event (non-blocking)
          const targetSpecialist = specialists.find(s => s.id === targetSpecialistId);
          const task = specialistTasks.find(t => t.id === parseInt(taskId));
          api.post('/admin/allocation-history', {
            event_type: 'TASK_REASSIGNMENT',
            specialist_id: specialistId,
            specialist_name: specialist?.full_name || specialist?.username,
            from_phase: fromPhase,
            to_phase: newPhase,
            task_id: parseInt(taskId),
            application_id: task?.application_id,
            from_specialist_id: specialistId,
            from_specialist_name: specialist?.full_name || specialist?.username,
            to_specialist_id: targetSpecialistId,
            to_specialist_name: targetSpecialist?.full_name || targetSpecialist?.username,
            reason: reason,
            performed_by_id: user?.id,
            performed_by_name: user?.full_name || user?.username || 'Admin',
          }).catch(err => console.log('Failed to log task reassignment:', err));
        } catch (taskError) {
          console.error(`Failed to reassign task ${taskId}:`, taskError);
        }
      }

      // Update specialist allocation
      const updateData = newPhase === 'NOT_ALLOCATED'
        ? { specialty_type: '' }
        : { specialty_type: newPhase };

      await api.put(`/admin/specialists/${specialistId}`, updateData);

      // Log the specialist reallocation event (non-blocking)
      const eventType = newPhase === 'NOT_ALLOCATED' ? 'MOVED_TO_UNALLOCATED' : 'REALLOCATION';
      api.post('/admin/allocation-history', {
        event_type: eventType,
        specialist_id: specialistId,
        specialist_name: specialist?.full_name || specialist?.username,
        from_phase: fromPhase,
        to_phase: newPhase,
        reason: reason,
        performed_by_id: user?.id,
        performed_by_name: user?.full_name || user?.username || 'Admin',
      }).catch(err => console.log('Failed to log allocation event:', err));

      await fetchData();
      // Refresh history in background
      fetchAllocationHistory().catch(() => {});
    } catch (error) {
      console.error('Failed to update specialist allocation:', error);
      alert('Failed to update specialist allocation. Please try again.');
    }
    setUpdatingAllocation(false);
    setDraggedSpecialist(null);
    setDragOverBucket(null);
  };

  // Handle reallocation confirmation
  const handleReallocationConfirm = async () => {
    if (!reallocationData) return;

    await executeAllocationChange(
      reallocationData.specialist.id,
      reallocationData.targetPhase,
      taskReassignments,
      REALLOCATION_REASONS.find(r => r.id === reallocationReason)?.label || reallocationReason
    );

    setReallocationModal(false);
    setReallocationData(null);
    setReallocationStep(1);
    setTaskReassignments({});
    setReallocationReason('');
    setSpecialistTasks([]);
  };

  // Cancel reallocation
  const handleReallocationCancel = () => {
    setReallocationModal(false);
    setReallocationData(null);
    setReallocationStep(1);
    setTaskReassignments({});
    setReallocationReason('');
    setDraggedTask(null);
    setDragOverSpecialist(null);
    setSpecialistTasks([]);
  };

  // Phase Transfer Modal handlers
  const handlePhaseTransferCancel = () => {
    setPhaseTransferModal(false);
    setPhaseTransferData(null);
    setPhaseTransferStep(1);
    setPhaseTransferOption('reassign');
    setPhaseTransferAssignments({});
  };

  const handlePhaseTransferContinue = () => {
    if (phaseTransferStep === 1) {
      setPhaseTransferStep(2);
    } else if (phaseTransferStep === 2) {
      setPhaseTransferStep(3);
    }
  };

  const handlePhaseTransferBack = () => {
    if (phaseTransferStep > 1) {
      setPhaseTransferStep(phaseTransferStep - 1);
    }
  };

  const handlePhaseTransferConfirm = async () => {
    if (!phaseTransferData) return;

    setPhaseTransferLoading(true);
    const { specialist, currentPhase, targetPhase, tasks } = phaseTransferData;

    try {
      if (phaseTransferOption === 'reassign') {
        // Option A: Full move with task reassignment
        // First reassign all tasks
        for (const [taskId, targetSpecId] of Object.entries(phaseTransferAssignments)) {
          try {
            await api.post(`/admin/tasks/${taskId}/reassign`, {
              new_specialist_id: targetSpecId,
            });
            // Log to allocation history
            const task = tasks.find(t => t.id === parseInt(taskId));
            const targetSpec = specialists.find(s => s.id === targetSpecId);
            await api.post('/admin/allocation-history', {
              event_type: 'TASK_REASSIGNMENT',
              specialist_id: targetSpecId,
              specialist_name: targetSpec?.full_name || targetSpec?.username || 'Unknown',
              from_phase: currentPhase,
              to_phase: currentPhase,
              reason: 'phase_transfer',
              details: `Task ${task?.application_id || taskId} reassigned due to phase transfer`,
            });
          } catch (error) {
            console.error(`Failed to reassign task ${taskId}:`, error);
          }
        }

        // Then move the specialist to the new phase
        await api.put(`/admin/specialists/${specialist.id}`, {
          specialty_type: targetPhase,
        });

        // Log the phase transfer
        await api.post('/admin/allocation-history', {
          event_type: 'PHASE_TRANSFER',
          specialist_id: specialist.id,
          specialist_name: specialist.full_name || specialist.username,
          from_phase: currentPhase,
          to_phase: targetPhase,
          reason: 'phase_transfer_reassigned',
          details: `${specialist.full_name || specialist.username} moved from ${currentPhase} to ${targetPhase}. ${Object.keys(phaseTransferAssignments).length} tasks reassigned.`,
        });

        setToastMessage({
          text: `${specialist.full_name || specialist.username} moved to ${targetPhase.replace(/_/g, ' ')} · ${Object.keys(phaseTransferAssignments).length} tasks reassigned`,
          type: 'success',
        });
      } else {
        // Option B: Dual-phase assignment
        // Update specialist to have both phases (using specialty_types array)
        const currentTypes = specialist.specialty_types || [];
        const newTypes = [...new Set([...currentTypes, currentPhase, targetPhase])];

        await api.put(`/admin/specialists/${specialist.id}`, {
          specialty_type: targetPhase, // Primary assignment to new phase
          specialty_types: newTypes,
          dual_phase: true,
          dual_phases: [currentPhase, targetPhase],
        });

        // Log the dual assignment
        await api.post('/admin/allocation-history', {
          event_type: 'PHASE_TRANSFER',
          specialist_id: specialist.id,
          specialist_name: specialist.full_name || specialist.username,
          from_phase: currentPhase,
          to_phase: `${currentPhase}+${targetPhase}`,
          reason: 'phase_transfer_dual_assigned',
          details: `${specialist.full_name || specialist.username} now active in both ${currentPhase} and ${targetPhase}`,
        });

        setToastMessage({
          text: `${specialist.full_name || specialist.username} now active in ${currentPhase.replace(/_/g, ' ')} + ${targetPhase.replace(/_/g, ' ')}`,
          type: 'success',
        });
      }

      // Refresh data
      await fetchData();

      // Close modal
      handlePhaseTransferCancel();
    } catch (error) {
      console.error('Failed to complete phase transfer:', error);
      setToastMessage({
        text: 'Failed to complete phase transfer. Please try again.',
        type: 'error',
      });
    }

    setPhaseTransferLoading(false);
  };

  // Dual-Phase Removal Modal handlers
  const handleDualRemovalOpen = async (specialist, fromPhase) => {
    // Fetch tasks for both phases
    setDualRemovalLoading(true);
    try {
      const [assignedRes, inProgressRes] = await Promise.all([
        api.get('/tasks', { params: { specialist_id: specialist.id, status: 'ASSIGNED' } }),
        api.get('/tasks', { params: { specialist_id: specialist.id, status: 'IN_PROGRESS' } }),
      ]);
      const allTasks = [
        ...(assignedRes.data || []),
        ...(inProgressRes.data || []),
      ];

      // Group tasks by phase
      const phaseToRemove = fromPhase; // The bucket where delete was clicked
      const phaseToKeep = specialist.dual_phases?.find(p => p !== phaseToRemove) || specialist.specialty_type;

      setDualRemovalData({
        specialist,
        phases: specialist.dual_phases || [],
        tasks: allTasks,
        phaseToRemove,
        phaseToKeep,
        tasksInRemovedPhase: allTasks.filter(t => t.phase === phaseToRemove),
      });
      setDualRemovalStep(1);
      setDualRemovalAssignments({});
      setDualRemovalModal(true);
    } catch (error) {
      console.error('Failed to fetch specialist tasks:', error);
      setToastMessage({ text: 'Failed to load tasks. Please try again.', type: 'error' });
    }
    setDualRemovalLoading(false);
  };

  const handleDualRemovalCancel = () => {
    setDualRemovalModal(false);
    setDualRemovalData(null);
    setDualRemovalStep(1);
    setDualRemovalAssignments({});
  };

  const handleDualRemovalContinue = () => {
    if (dualRemovalStep < 3) {
      setDualRemovalStep(dualRemovalStep + 1);
    }
  };

  const handleDualRemovalBack = () => {
    if (dualRemovalStep > 1) {
      setDualRemovalStep(dualRemovalStep - 1);
    }
  };

  const handleDualRemovalConfirm = async () => {
    if (!dualRemovalData) return;

    setDualRemovalLoading(true);
    const { specialist, phaseToRemove, phaseToKeep, tasksInRemovedPhase } = dualRemovalData;

    try {
      // First, reassign or unassign tasks in the removed phase
      for (const task of tasksInRemovedPhase) {
        const targetSpecId = dualRemovalAssignments[task.id];
        if (targetSpecId) {
          // Reassign to another specialist
          await api.post(`/admin/tasks/${task.id}/reassign`, {
            new_specialist_id: targetSpecId,
          });
          const targetSpec = specialists.find(s => s.id === targetSpecId);
          await api.post('/admin/allocation-history', {
            event_type: 'TASK_REASSIGNMENT',
            specialist_id: targetSpecId,
            specialist_name: targetSpec?.full_name || targetSpec?.username || 'Unknown',
            from_specialist_id: specialist.id,
            from_specialist_name: specialist.full_name || specialist.username,
            from_phase: phaseToRemove,
            to_phase: phaseToRemove,
            task_id: task.id,
            application_id: task.application_id,
            reason: 'dual_phase_removal',
            reason_details: `Task reassigned due to ${specialist.full_name || specialist.username} exiting ${phaseToRemove} phase`,
          });
        } else {
          // Unassign the task (make it available in the queue)
          await api.post(`/admin/tasks/${task.id}/unassign`);
        }
      }

      // Update specialist to remove dual-phase status
      await api.put(`/admin/specialists/${specialist.id}`, {
        specialty_type: phaseToKeep,
        dual_phase: false,
        dual_phases: [],
      });

      // Log the dual removal
      await api.post('/admin/allocation-history', {
        event_type: 'DUAL_PHASE_REMOVED',
        specialist_id: specialist.id,
        specialist_name: specialist.full_name || specialist.username,
        from_phase: `${specialist.dual_phases?.join('+')}`,
        to_phase: phaseToKeep,
        reason: 'dual_phase_removal',
        reason_details: `${specialist.full_name || specialist.username} removed from dual-phase. Now only in ${phaseToKeep}. ${tasksInRemovedPhase.length} tasks offboarded from ${phaseToRemove}.`,
      });

      setToastMessage({
        text: `${specialist.full_name || specialist.username} removed from dual-phase · Now only in ${phaseToKeep.replace(/_/g, ' ')}`,
        type: 'success',
      });

      // Refresh data
      await fetchData();

      // Close modal
      handleDualRemovalCancel();
    } catch (error) {
      console.error('Failed to remove dual-phase:', error);
      setToastMessage({
        text: 'Failed to remove dual-phase. Please try again.',
        type: 'error',
      });
    }

    setDualRemovalLoading(false);
  };

  // Get available specialists for dual removal task reassignment
  const getAvailableSpecialistsForDualRemoval = (phase) => {
    return specialists.filter(s =>
      s.role !== 'admin' &&
      s.id !== dualRemovalData?.specialist?.id &&
      (s.specialty_type === phase || (s.specialty_types || []).includes(phase) || (s.dual_phases || []).includes(phase))
    );
  };

  // Check if all tasks in removed phase are assigned
  const allDualRemovalTasksHandled = dualRemovalData?.tasksInRemovedPhase?.length === 0 ||
    dualRemovalData?.tasksInRemovedPhase?.every(t => dualRemovalAssignments[t.id] !== undefined);

  // Get available specialists for task reassignment (certified for the phase)
  const getAvailableSpecialistsForPhase = (phase) => {
    return specialists.filter(s =>
      s.role !== 'admin' &&
      s.id !== phaseTransferData?.specialist?.id &&
      (s.specialty_type === phase || (s.specialty_types || []).includes(phase))
    );
  };

  // Check if all tasks are assigned (for Step 2A validation)
  const allTasksAssigned = phaseTransferData?.tasks?.length > 0 &&
    Object.keys(phaseTransferAssignments).length === phaseTransferData.tasks.length;

  // Calculate statistics from workload data for accuracy
  const totalPendingTasks = workload?.by_specialty ? Object.values(workload.by_specialty).reduce((sum, s) => sum + (s.pending || 0), 0) : 0;
  const totalInProgressTasks = workload?.by_specialty ? Object.values(workload.by_specialty).reduce((sum, s) => sum + (s.in_progress || 0), 0) : 0;
  const totalCompletedTasks = workload?.by_specialty ? Object.values(workload.by_specialty).reduce((sum, s) => sum + (s.completed || 0), 0) : 0;

  const stats = {
    totalApplications: totalApplications,
    inProgress: applications.filter(a => a.status === 'IN_PROGRESS').length,
    completed: applications.filter(a => a.status === 'COMPLETED').length,
    pending: applications.filter(a => a.status === 'PENDING').length,
    totalSpecialists: specialists.length,
    activeSpecialists: specialists.filter(s => s.is_active && s.role !== 'admin').length,
    activeAdmins: specialists.filter(s => s.is_active && s.role === 'admin').length,
    totalPendingTasks,
    totalInProgressTasks,
    totalCompletedTasks,
    totalActiveTasks: totalPendingTasks + totalInProgressTasks,
    unassignedTasks: workload?.unassigned_tasks || 0,
  };

  // Filter specialists based on search
  const filteredSpecialists = specialists.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.specialty_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = {
    container: {
      minHeight: '100vh',
      background: isDark
        ? 'linear-gradient(135deg, #0a0f1a 0%, #0d1526 50%, #0a1628 100%)'
        : 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
    },
    header: {
      background: 'linear-gradient(135deg, #003B73 0%, #0a4b94 50%, #117ACA 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.15)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px rgba(0, 59, 115, 0.3)',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    logoIcon: {
      width: '42px',
      height: '42px',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    logoText: {
      display: 'flex',
      flexDirection: 'column',
    },
    logoTitle: {
      fontSize: '18px',
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: '-0.5px',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    },
    logoSubtitle: {
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '500',
      letterSpacing: '0.5px',
    },
    systemStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: '20px',
      background: 'rgba(16, 185, 129, 0.2)',
      border: '1px solid rgba(16, 185, 129, 0.4)',
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#10b981',
      boxShadow: '0 0 8px #10b981',
      animation: 'pulse 2s infinite',
    },
    statusText: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#10b981',
    },
    headerCenter: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    timeDisplay: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    timeText: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      fontFamily: 'monospace',
      letterSpacing: '2px',
    },
    dateText: {
      fontSize: '11px',
      color: isDark ? '#64748b' : '#94a3b8',
      fontWeight: '500',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 12px',
      borderRadius: '10px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    userAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: '700',
      fontSize: '14px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    },
    userName: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#ffffff',
    },
    userRole: {
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    iconBtn: {
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
    },
    themeToggleBtn: {
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(99, 102, 241, 0.2)',
      color: isDark ? '#fbbf24' : '#818cf8',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
    },
    logoutBtn: {
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#fca5a5',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
    },
    closeBtn: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
    },
    closeBtnSmall: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
    },
    main: {
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto',
    },
    // Stats Grid
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px',
    },
    statCard: {
      background: isDark ? 'rgba(17, 34, 64, 0.8)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      position: 'relative',
      overflow: 'hidden',
    },
    statIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '12px',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '800',
      color: isDark ? '#ffffff' : '#0d1526',
      lineHeight: 1,
      marginBottom: '4px',
    },
    statLabel: {
      fontSize: '13px',
      color: isDark ? '#64748b' : '#94a3b8',
      fontWeight: '500',
    },
    statTrend: {
      position: 'absolute',
      top: '16px',
      right: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      fontWeight: '600',
    },
    // Grid Layout
    gridLayout: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginBottom: '24px',
    },
    // Card Styles
    card: {
      background: isDark ? 'rgba(17, 34, 64, 0.8)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      overflow: 'hidden',
    },
    cardHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: '15px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    cardBody: {
      padding: '20px',
    },
    // Workload Grid
    workloadGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
    },
    workloadItem: {
      padding: '14px',
      borderRadius: '12px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
    },
    workloadLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDark ? '#94a3b8' : '#64748b',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    workloadStats: {
      display: 'flex',
      gap: '16px',
    },
    workloadStat: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    workloadNumber: {
      fontSize: '18px',
      fontWeight: '700',
    },
    workloadMini: {
      fontSize: '11px',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    // Pipeline
    pipeline: {
      display: 'flex',
      gap: '8px',
      alignItems: 'stretch',
    },
    pipelineStage: {
      flex: 1,
      padding: '12px',
      borderRadius: '10px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
      textAlign: 'center',
    },
    pipelineName: {
      fontSize: '10px',
      fontWeight: '600',
      color: isDark ? '#64748b' : '#94a3b8',
      marginBottom: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    pipelineCount: {
      fontSize: '20px',
      fontWeight: '800',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    // Table Styles
    tableContainer: {
      overflowX: 'auto',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: isDark ? '#64748b' : '#94a3b8',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    },
    td: {
      padding: '14px 16px',
      fontSize: '14px',
      color: isDark ? '#e2e8f0' : '#1e293b',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    },
    actionBtn: {
      padding: '6px 10px',
      borderRadius: '6px',
      border: 'none',
      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      color: isDark ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      fontWeight: '500',
      marginRight: '6px',
      transition: 'all 0.2s',
    },
    // Search Bar
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '10px',
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      width: '250px',
    },
    searchInput: {
      flex: 1,
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontSize: '13px',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    // Quick Actions
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
    },
    quickAction: {
      padding: '16px',
      borderRadius: '12px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      textAlign: 'center',
    },
    quickActionIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      background: isDark ? '#112240' : '#ffffff',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '500px',
      boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      margin: 0,
    },
    modalBody: {
      padding: '24px',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: isDark ? '#94a3b8' : '#64748b',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      fontSize: '14px',
      borderRadius: '10px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
      background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
      color: isDark ? '#e2e8f0' : '#1e293b',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    select: {
      width: '100%',
      padding: '12px 14px',
      fontSize: '14px',
      borderRadius: '10px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
      background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
      color: isDark ? '#e2e8f0' : '#1e293b',
      outline: 'none',
      boxSizing: 'border-box',
    },
    passwordWrapper: {
      position: 'relative',
    },
    passwordToggle: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    error: {
      padding: '12px 14px',
      borderRadius: '10px',
      background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      fontSize: '13px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    },
    cancelBtn: {
      padding: '10px 20px',
      borderRadius: '10px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
      background: 'transparent',
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    saveBtn: {
      padding: '10px 24px',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(17, 122, 202, 0.3)',
    },
    deleteBtn: {
      padding: '10px 24px',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    },
    deleteModalIcon: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      fontSize: '28px',
    },
    deleteModalText: {
      textAlign: 'center',
      color: isDark ? '#e2e8f0' : '#1e293b',
      fontSize: '15px',
      lineHeight: '1.6',
    },
    deleteModalItemName: {
      fontWeight: '600',
      color: isDark ? '#f87171' : '#dc2626',
    },
    // Tab Navigation
    tabNav: {
      display: 'flex',
      gap: '4px',
      padding: '12px 24px',
      background: isDark ? 'rgba(13, 21, 38, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    },
    tab: {
      padding: '10px 24px',
      borderRadius: '10px',
      border: 'none',
      background: 'transparent',
      color: isDark ? '#64748b' : '#94a3b8',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
    },
    tabActive: {
      background: isDark ? 'rgba(17, 122, 202, 0.2)' : 'rgba(17, 122, 202, 0.1)',
      color: colors.primary,
    },
    // Analytics Cards
    analyticsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '24px',
      marginBottom: '24px',
    },
    analyticsCard: {
      background: isDark ? 'rgba(17, 34, 64, 0.8)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      overflow: 'hidden',
    },
    analyticsCardFull: {
      gridColumn: '1 / -1',
    },
    chartContainer: {
      width: '100%',
      minHeight: '300px',
      overflow: 'hidden',
    },
    // Expand button
    expandBtn: {
      padding: '6px 12px',
      borderRadius: '8px',
      border: 'none',
      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      color: isDark ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    // Expanded Modal
    expandedOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '40px',
    },
    expandedModal: {
      background: isDark ? '#0d1526' : '#ffffff',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    expandedHeader: {
      padding: '20px 24px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    expandedTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    expandedBody: {
      flex: 1,
      padding: '24px',
      overflow: 'auto',
    },
    expandedChartContainer: {
      width: '100%',
      height: '600px',
    },
    // Allocation Tab Styles
    allocationContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
    },
    allocationBucket: {
      background: isDark ? 'rgba(17, 34, 64, 0.8)' : 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      minHeight: '200px',
      transition: 'all 0.2s',
      overflow: 'hidden',
    },
    allocationBucketDragOver: {
      borderColor: colors.chaseBlue,
      background: isDark ? 'rgba(10, 75, 148, 0.2)' : 'rgba(10, 75, 148, 0.1)',
      boxShadow: `0 0 20px ${colors.chaseBlue}40`,
    },
    bucketHeader: {
      padding: '14px 16px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bucketTitle: {
      fontSize: '12px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    bucketCount: {
      fontSize: '11px',
      fontWeight: '600',
      color: colors.chaseBlue,
      background: `${colors.chaseBlue}20`,
      padding: '2px 8px',
      borderRadius: '10px',
    },
    bucketContent: {
      padding: '12px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      minHeight: '120px',
      alignContent: 'flex-start',
    },
    specialistChip: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '10px',
      background: isDark ? 'rgba(10, 75, 148, 0.2)' : 'rgba(10, 75, 148, 0.08)',
      border: `1px solid ${isDark ? 'rgba(26, 111, 201, 0.4)' : 'rgba(10, 75, 148, 0.2)'}`,
      cursor: 'grab',
      transition: 'all 0.2s',
      userSelect: 'none',
    },
    specialistChipDragging: {
      opacity: 0.5,
      transform: 'scale(0.95)',
    },
    specialistAvatar: {
      width: '28px',
      height: '28px',
      borderRadius: '8px',
      background: `linear-gradient(135deg, ${colors.chaseBlue} 0%, ${colors.chaseBlueLight} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '700',
    },
    specialistInfo: {
      display: 'flex',
      flexDirection: 'column',
    },
    specialistName: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    specialistTasks: {
      fontSize: '10px',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    // Reallocation Modal Styles
    reallocationOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    reallocationModal: {
      background: isDark ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: '85vh',
      overflow: 'hidden',
      boxShadow: isDark
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)'
        : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
    },
    reallocationHeader: {
      padding: '24px 28px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reallocationTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '18px',
      fontWeight: '700',
      color: isDark ? '#f1f5f9' : '#1e293b',
    },
    reallocationBody: {
      padding: '28px',
      overflowY: 'auto',
      maxHeight: 'calc(85vh - 180px)',
    },
    reallocationFooter: {
      padding: '20px 28px',
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
    },
    stepIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    stepDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      transition: 'all 0.3s',
    },
    stepDotActive: {
      background: colors.chaseBlue,
      boxShadow: `0 0 12px ${colors.chaseBlue}60`,
      transform: 'scale(1.2)',
    },
    stepDotCompleted: {
      background: colors.success,
    },
    warningBox: {
      background: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
      border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)'}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      marginBottom: '24px',
    },
    warningIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: `linear-gradient(135deg, ${colors.orange} 0%, #ea580c 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    warningContent: {
      flex: 1,
    },
    warningTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: colors.orange,
      marginBottom: '6px',
    },
    warningText: {
      fontSize: '14px',
      color: isDark ? '#94a3b8' : '#64748b',
      lineHeight: '1.5',
    },
    specialistCard: {
      background: isDark ? 'rgba(10, 75, 148, 0.15)' : 'rgba(10, 75, 148, 0.08)',
      border: `1px solid ${isDark ? 'rgba(10, 75, 148, 0.3)' : 'rgba(10, 75, 148, 0.15)'}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '24px',
    },
    specialistAvatarLarge: {
      width: '56px',
      height: '56px',
      borderRadius: '14px',
      background: `linear-gradient(135deg, ${colors.chaseBlue} 0%, ${colors.chaseBlueLight} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '20px',
      fontWeight: '700',
    },
    taskReassignArea: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginTop: '20px',
    },
    taskList: {
      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
      borderRadius: '16px',
      padding: '16px',
      minHeight: '200px',
    },
    taskListTitle: {
      fontSize: '13px',
      fontWeight: '700',
      color: isDark ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    taskItem: {
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '10px',
      padding: '12px',
      marginBottom: '8px',
      cursor: 'grab',
      transition: 'all 0.2s',
    },
    taskItemDragging: {
      opacity: 0.5,
      transform: 'scale(0.95)',
    },
    targetSpecialistCard: {
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
      borderWidth: '2px',
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
      borderRadius: '12px',
      padding: '12px',
      marginBottom: '8px',
      transition: 'all 0.2s',
      minHeight: '60px',
    },
    targetSpecialistCardOver: {
      borderColor: colors.chaseBlue,
      background: isDark ? 'rgba(10, 75, 148, 0.2)' : 'rgba(10, 75, 148, 0.1)',
      boxShadow: `0 0 20px ${colors.chaseBlue}30`,
    },
    reasonGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginTop: '20px',
    },
    reasonCard: {
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderRadius: '14px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    reasonCardSelected: {
      borderColor: colors.chaseBlue,
      background: isDark ? 'rgba(10, 75, 148, 0.2)' : 'rgba(10, 75, 148, 0.1)',
      boxShadow: `0 0 20px ${colors.chaseBlue}20`,
    },
    reasonIcon: {
      fontSize: '24px',
    },
    reasonLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    modalActionBtn: {
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    actionBtnPrimary: {
      background: `linear-gradient(135deg, ${colors.chaseBlue} 0%, ${colors.chaseBlueLight} 100%)`,
      color: '#fff',
      boxShadow: `0 4px 15px ${colors.chaseBlue}40`,
    },
    actionBtnSecondary: {
      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      color: isDark ? '#94a3b8' : '#64748b',
    },
    actionBtnDanger: {
      background: `linear-gradient(135deg, ${colors.orange} 0%, #ea580c 100%)`,
      color: '#fff',
      boxShadow: `0 4px 15px ${colors.orange}40`,
    },
    assignedTaskBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: '600',
      padding: '4px 8px',
      borderRadius: '6px',
      background: `${colors.success}20`,
      color: colors.success,
      marginTop: '6px',
    },
  };

  // Application pipeline by phase - using workload data for accurate counts
  const pipelineData = SPECIALTY_TYPES.map(phase => {
    const workloadForPhase = workload?.by_specialty?.[phase];
    const pendingCount = workloadForPhase?.pending || 0;
    const inProgressCount = workloadForPhase?.in_progress || 0;
    const completedCount = workloadForPhase?.completed || 0;

    return {
      name: phase.replace('_', ' '),
      count: pendingCount + inProgressCount, // Active tasks in pipeline
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount,
      total: pendingCount + inProgressCount + completedCount,
    };
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <LuShield size={22} color="#fff" />
            </div>
            <div style={styles.logoText}>
              <span style={styles.logoTitle}>Command Center</span>
              <span style={styles.logoSubtitle}>LOAN ASSUMPTION SYSTEM</span>
            </div>
          </div>
          <div style={styles.systemStatus}>
            <div style={styles.statusDot} />
            <span style={styles.statusText}>All Systems Operational</span>
          </div>
        </div>

        <div style={styles.headerCenter}>
          {/* World Clock */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            {[
              { city: 'Hyderabad', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
              { city: 'Manila', timezone: 'Asia/Manila', flag: '🇵🇭' },
              { city: 'Delaware', timezone: 'America/New_York', flag: '🇺🇸' },
              { city: 'Columbus', timezone: 'America/New_York', flag: '🇺🇸' },
              { city: 'Dallas', timezone: 'America/Chicago', flag: '🇺🇸' },
            ].map((loc) => {
              const timeInZone = new Date(currentTime.toLocaleString('en-US', { timeZone: loc.timezone }));
              const hours = timeInZone.getHours();
              const isNight = hours < 6 || hours >= 20;
              const isEvening = hours >= 18 && hours < 20;
              const isMorning = hours >= 6 && hours < 9;

              return (
                <div
                  key={loc.city}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isNight ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    minWidth: '90px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '14px' }}>{loc.flag}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {loc.city}
                    </span>
                    <span style={{ fontSize: '12px' }}>
                      {isNight ? '🌙' : isEvening ? '🌆' : isMorning ? '🌅' : '☀️'}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    color: '#ffffff',
                    letterSpacing: '1px',
                  }}>
                    {currentTime.toLocaleTimeString('en-US', {
                      timeZone: loc.timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: '2px',
                  }}>
                    {currentTime.toLocaleDateString('en-US', {
                      timeZone: loc.timezone,
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <div style={styles.userName}>{user?.full_name || 'Admin'}</div>
              <div style={styles.userRole}>{user?.role || 'Administrator'}</div>
            </div>
          </div>
          <button
            style={{
              ...styles.iconBtn,
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }}
            onClick={handleRefresh}
            title="Refresh Data"
          >
            <LuRefreshCw size={18} />
          </button>
          <button
            style={styles.iconBtn}
            onClick={() => navigate('/applications')}
            title="Applications"
          >
            <LuHouse size={18} />
          </button>
          <button
            style={styles.themeToggleBtn}
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <LuSun size={18} /> : <LuMoon size={18} />}
          </button>
          <button
            style={styles.logoutBtn}
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            title="Logout"
          >
            <LuLogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('overview')}
        >
          <LuLayers size={18} />
          Overview
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'analytics' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('analytics')}
        >
          <LuChartBar size={18} />
          Analytics
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'allocation' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('allocation')}
        >
          <LuUsers size={18} />
          Specialists Allocation
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'workflow' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('workflow')}
        >
          <LuWorkflow size={18} />
          Workflow Config
        </button>
      </div>

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'overview' && (
          <>
        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${colors.lightBlue}20` }}>
              <LuFileText size={24} color={colors.lightBlue} />
            </div>
            <div style={styles.statValue}>{stats.totalApplications}</div>
            <div style={styles.statLabel}>Total Applications</div>
            <div style={{ ...styles.statTrend, color: colors.lightBlue }}>
              <LuTrendingUp size={14} />
              Active
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${colors.warning}20` }}>
              <LuActivity size={24} color={colors.warning} />
            </div>
            <div style={styles.statValue}>{stats.totalActiveTasks}</div>
            <div style={styles.statLabel}>Active Tasks</div>
            <div style={{ ...styles.statTrend, color: colors.warning }}>
              <LuCirclePlay size={14} />
              {stats.totalPendingTasks} Pending
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${colors.success}20` }}>
              <LuCircleCheckBig size={24} color={colors.success} />
            </div>
            <div style={styles.statValue}>{stats.totalCompletedTasks}</div>
            <div style={styles.statLabel}>Completed Tasks</div>
            <div style={{ ...styles.statTrend, color: colors.success }}>
              <LuArrowUpRight size={14} />
              {stats.completed} Apps Done
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${colors.purple}20` }}>
              <LuUsers size={24} color={colors.purple} />
            </div>
            <div style={styles.statValue}>{stats.activeSpecialists}</div>
            <div style={styles.statLabel}>Active Specialists</div>
            <div style={{ ...styles.statTrend, color: colors.purple }}>
              <LuShield size={14} />
              {stats.activeAdmins} Admin{stats.activeAdmins !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div style={styles.gridLayout}>
          {/* Workload Distribution */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>
                <LuBriefcase size={18} color={colors.primary} />
                Workload Distribution
              </div>
              {stats.unassignedTasks > 0 && (
                <span style={{
                  ...styles.badge,
                  background: `${colors.warning}20`,
                  color: colors.warning,
                }}>
                  <LuCircleAlert size={12} />
                  {stats.unassignedTasks} Unassigned
                </span>
              )}
            </div>
            <div style={styles.cardBody}>
              <div style={styles.workloadGrid}>
                {workload?.by_specialty &&
                  Object.entries(workload.by_specialty).map(([specialty, data]) => (
                    <div key={specialty} style={styles.workloadItem}>
                      <div style={styles.workloadLabel}>
                        <LuLayers size={12} />
                        {specialty.replace('_', ' ')}
                      </div>
                      <div style={styles.workloadStats}>
                        <div style={styles.workloadStat}>
                          <LuClock size={14} color={colors.primary} />
                          <span style={{ ...styles.workloadNumber, color: colors.primary }}>{data.pending}</span>
                          <span style={styles.workloadMini}>pending</span>
                        </div>
                        <div style={styles.workloadStat}>
                          <LuActivity size={14} color={colors.warning} />
                          <span style={{ ...styles.workloadNumber, color: colors.warning }}>{data.in_progress}</span>
                          <span style={styles.workloadMini}>active</span>
                        </div>
                        <div style={styles.workloadStat}>
                          <LuCircleCheck size={14} color={colors.success} />
                          <span style={{ ...styles.workloadNumber, color: colors.success }}>{data.completed}</span>
                          <span style={styles.workloadMini}>done</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Application Pipeline */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>
                <LuGitBranch size={18} color={colors.cyan} />
                Application Pipeline
              </div>
              <span style={{
                ...styles.badge,
                background: `${colors.primary}20`,
                color: colors.primary,
              }}>
                {stats.inProgress} Active
              </span>
            </div>
            <div style={styles.cardBody}>
              {/* 3D Cylindrical Pipe Visual */}
              <div style={{
                position: 'relative',
                padding: '20px 0',
              }}>
                {/* Main Cylindrical Pipe with Stage Circles Inside */}
                <div style={{
                  position: 'relative',
                  marginLeft: '30px',
                  marginRight: '10px',
                  height: '90px',
                  borderRadius: '45px',
                  background: isDark
                    ? `linear-gradient(180deg,
                        #93c5fd 0%,
                        #60a5fa 10%,
                        #3b82f6 20%,
                        #2563eb 35%,
                        #1d4ed8 50%,
                        #1e40af 65%,
                        #2563eb 80%,
                        #3b82f6 100%)`
                    : `linear-gradient(180deg,
                        #93c5fd 0%,
                        #60a5fa 10%,
                        #3b82f6 20%,
                        #2563eb 35%,
                        #1d4ed8 50%,
                        #1e40af 65%,
                        #1e3a8a 80%,
                        #172554 100%)`,
                  border: isDark ? '2px solid #60a5fa' : 'none',
                  boxShadow: isDark
                    ? '0 10px 40px rgba(59,130,246,0.3), inset 0 2px 4px rgba(255,255,255,0.2)'
                    : '0 10px 40px rgba(30,64,175,0.3), inset 0 2px 4px rgba(255,255,255,0.4)',
                }}>
                  {/* Inner Hollow Area */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    bottom: '12px',
                    borderRadius: '35px',
                    background: isDark
                      ? `linear-gradient(180deg,
                          #1e3a5f 0%,
                          #234876 30%,
                          #2a5690 50%,
                          #234876 70%,
                          #1e3a5f 100%)`
                      : `linear-gradient(180deg,
                          #e2e8f0 0%,
                          #f1f5f9 30%,
                          #ffffff 50%,
                          #f1f5f9 70%,
                          #e2e8f0 100%)`,
                    boxShadow: isDark
                      ? 'inset 0 4px 15px rgba(0,0,0,0.4)'
                      : 'inset 0 4px 15px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '0 30px',
                  }}>
                    {/* Stage Circles Inside Pipe with Ribs */}
                    {pipelineData.map((stage, idx) => {
                      const hasApplications = stage.count > 0;

                      return (
                        <React.Fragment key={stage.name}>
                          {/* Stage Circle */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}>
                            <div style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '50%',
                              background: hasApplications
                                ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.cyan} 100%)`
                                : isDark
                                  ? 'linear-gradient(135deg, #1e3a5f 0%, #2a5690 50%, #1e3a5f 100%)'
                                  : 'linear-gradient(135deg, #cbd5e1 0%, #e2e8f0 50%, #cbd5e1 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: hasApplications
                                ? `0 0 20px ${colors.cyan}80, inset 0 2px 4px rgba(255,255,255,0.3)`
                                : isDark
                                  ? '0 2px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1)'
                                  : '0 2px 8px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.8)',
                              border: hasApplications
                                ? `3px solid ${colors.cyan}`
                                : isDark
                                  ? '2px solid #60a5fa'
                                  : '2px solid #94a3b8',
                            }}>
                              <span style={{
                                color: hasApplications ? '#fff' : isDark ? '#93c5fd' : '#64748b',
                                fontWeight: '800',
                                fontSize: '18px',
                                textShadow: hasApplications ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                              }}>
                                {stage.count}
                              </span>
                            </div>
                          </div>

                          {/* Curved Rib Divider - between sections */}
                          {idx < pipelineData.length - 1 && (
                            <div style={{
                              width: '4px',
                              height: '66px',
                              borderRadius: '50%',
                              background: isDark ? '#60a5fa' : '#3b82f6',
                              boxShadow: isDark
                                ? '0 0 6px rgba(96,165,250,0.6)'
                                : '0 0 6px rgba(59,130,246,0.4)',
                            }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Left End Cap - Pipe Opening */}
                  <div style={{
                    position: 'absolute',
                    left: '-5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '90px',
                    borderRadius: '50%',
                    background: isDark
                      ? `radial-gradient(ellipse at 30% 50%, #93c5fd 0%, #60a5fa 20%, #3b82f6 40%, #2563eb 60%, #3b82f6 80%, #60a5fa 100%)`
                      : `radial-gradient(ellipse at 30% 50%, #93c5fd 0%, #60a5fa 25%, #3b82f6 40%, #2563eb 60%, #1e40af 80%, #1e3a8a 100%)`,
                    border: isDark ? '2px solid #60a5fa' : 'none',
                    boxShadow: isDark
                      ? '4px 0 15px rgba(59,130,246,0.3), inset -3px 0 10px rgba(255,255,255,0.2)'
                      : '4px 0 15px rgba(30,64,175,0.3), inset -3px 0 10px rgba(255,255,255,0.3)',
                  }}>
                    {/* Inner hole */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '30px',
                      height: '55px',
                      borderRadius: '50%',
                      background: isDark
                        ? 'radial-gradient(ellipse, #2a5690 0%, #234876 60%, #1e3a5f 100%)'
                        : 'radial-gradient(ellipse, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)',
                      boxShadow: isDark
                        ? 'inset 0 0 10px rgba(0,0,0,0.3)'
                        : 'inset 0 0 10px rgba(0,0,0,0.1)',
                    }} />
                  </div>
                </div>

                {/* Stage Labels Below Pipe */}
                <div style={{
                  display: 'flex',
                  marginTop: '20px',
                  marginBottom: '10px',
                  marginLeft: '30px',
                  marginRight: '10px',
                  paddingLeft: '42px',
                  paddingRight: '30px',
                }}>
                  {pipelineData.map((stage, idx) => {
                    const hasApplications = stage.count > 0;
                    return (
                      <React.Fragment key={stage.name}>
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          justifyContent: 'center',
                        }}>
                          <div style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            color: hasApplications ? colors.cyan : (isDark ? '#64748b' : '#94a3b8'),
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            transform: 'rotate(-35deg)',
                            transformOrigin: 'top center',
                          }}>
                            {stage.name}
                          </div>
                        </div>
                        {/* Spacer for rib */}
                        {idx < pipelineData.length - 1 && (
                          <div style={{ width: '4px' }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Pipeline Stats Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: '16px',
                padding: '14px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: '10px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: colors.warning }}>
                    {stats.totalPendingTasks}
                  </div>
                  <div style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8', fontWeight: '600' }}>
                    PENDING TASKS
                  </div>
                </div>
                <div style={{ width: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: colors.primary }}>
                    {stats.totalInProgressTasks}
                  </div>
                  <div style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8', fontWeight: '600' }}>
                    IN PROGRESS
                  </div>
                </div>
                <div style={{ width: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: colors.success }}>
                    {stats.totalCompletedTasks}
                  </div>
                  <div style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8', fontWeight: '600' }}>
                    COMPLETED
                  </div>
                </div>
                <div style={{ width: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: colors.cyan }}>
                    {stats.totalActiveTasks}
                  </div>
                  <div style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8', fontWeight: '600' }}>
                    TOTAL ACTIVE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ ...styles.card, marginBottom: '24px' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <LuZap size={18} color={colors.warning} />
              Quick Actions
            </div>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.quickActions}>
              <div
                style={styles.quickAction}
                onClick={openCreateModal}
                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
              >
                <div style={{ ...styles.quickActionIcon, background: `${colors.success}20` }}>
                  <LuPlus size={20} color={colors.success} />
                </div>
                <span style={styles.quickActionLabel}>Add Specialist</span>
              </div>
              <div
                style={styles.quickAction}
                onClick={() => navigate('/applications')}
                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
              >
                <div style={{ ...styles.quickActionIcon, background: `${colors.primary}20` }}>
                  <LuFileText size={20} color={colors.primary} />
                </div>
                <span style={styles.quickActionLabel}>View Applications</span>
              </div>
              <div
                style={styles.quickAction}
                onClick={() => navigate('/workbench')}
                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
              >
                <div style={{ ...styles.quickActionIcon, background: `${colors.purple}20` }}>
                  <LuClipboardList size={20} color={colors.purple} />
                </div>
                <span style={styles.quickActionLabel}>Specialist Workbench</span>
              </div>
              <div
                style={styles.quickAction}
                onClick={handleRefresh}
                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
              >
                <div style={{ ...styles.quickActionIcon, background: `${colors.cyan}20` }}>
                  <LuRefreshCw size={20} color={colors.cyan} />
                </div>
                <span style={styles.quickActionLabel}>Refresh Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Specialists Table */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <LuUsers size={18} color={colors.purple} />
              Specialists ({filteredSpecialists.length})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={styles.searchBar}>
                <LuSearch size={16} color={isDark ? '#64748b' : '#94a3b8'} />
                <input
                  type="text"
                  placeholder="Search specialists..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                style={{
                  ...styles.actionBtn,
                  background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
                  color: '#fff',
                }}
                onClick={openCreateModal}
              >
                <LuPlus size={14} />
                Add New
              </button>
            </div>
          </div>
          <div style={styles.tableContainer}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: isDark ? '#64748b' : '#94a3b8' }}>
                <LuRefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <p>Loading specialists...</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Specialist</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Specialty</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Tasks</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Last Active</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpecialists.map((specialist) => (
                    <tr key={specialist.id}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.cyan} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '14px',
                          }}>
                            {specialist.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600' }}>{specialist.full_name}</div>
                            {specialist.email && (
                              <div style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
                                {specialist.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '13px' }}>
                        {specialist.username}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                          {(specialist.specialty_types && specialist.specialty_types.length > 0) ? (
                            specialist.specialty_types.map((type, idx) => (
                              <span
                                key={idx}
                                style={{
                                  ...styles.badge,
                                  background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  padding: '3px 8px',
                                }}
                              >
                                {type?.replace('_', ' ')}
                              </span>
                            ))
                          ) : (
                            <span style={{
                              ...styles.badge,
                              background: specialist.specialty_type === 'NOT_ALLOCATED'
                                ? `${colors.orange}20`
                                : 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
                              color: specialist.specialty_type === 'NOT_ALLOCATED' ? colors.orange : '#fff',
                            }}>
                              {specialist.specialty_type?.replace('_', ' ') || 'NOT ALLOCATED'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: `${colors.purple}20`,
                          color: colors.purple,
                        }}>
                          {specialist.role}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ color: colors.primary, fontWeight: '600' }}>
                            {specialist.pending_tasks_count || 0} <span style={{ fontWeight: '400', color: isDark ? '#64748b' : '#94a3b8' }}>pending</span>
                          </span>
                          <span style={{ color: colors.warning, fontWeight: '600' }}>
                            {specialist.in_progress_tasks_count || 0} <span style={{ fontWeight: '400', color: isDark ? '#64748b' : '#94a3b8' }}>active</span>
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: specialist.is_active ? `${colors.success}20` : `${colors.danger}20`,
                          color: specialist.is_active ? colors.success : colors.danger,
                        }}>
                          {specialist.is_active ? (
                            <><LuCircle size={8} fill="currentColor" /> Active</>
                          ) : (
                            <><LuCircleX size={12} /> Inactive</>
                          )}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: isDark ? '#64748b' : '#94a3b8', fontSize: '13px' }}>
                        {specialist.last_login_at
                          ? format(new Date(specialist.last_login_at), 'MMM d, h:mm a')
                          : 'Never'}
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.actionBtn}
                          onClick={() => openEditModal(specialist)}
                          title="Edit"
                        >
                          <LuPencil size={14} />
                        </button>
                        <button
                          style={{ ...styles.actionBtn, color: colors.danger }}
                          onClick={() => handleDelete(specialist)}
                          title="Deactivate"
                        >
                          <LuTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            networkGraphRef={networkGraphRef}
            barChartRef={barChartRef}
            donutChartRef={donutChartRef}
            sankeyRef={sankeyRef}
            setExpandedChart={setExpandedChart}
            isDark={isDark}
            styles={styles}
          />
        )}
        {/* Specialists Allocation Tab */}
        {activeTab === 'allocation' && (
          <AllocationTab
            specialists={specialists}
            allocationSubTab={allocationSubTab}
            setAllocationSubTab={setAllocationSubTab}
            updatingAllocation={updatingAllocation}
            draggedSpecialist={draggedSpecialist}
            setDraggedSpecialist={setDraggedSpecialist}
            dragOverBucket={dragOverBucket}
            setDragOverBucket={setDragOverBucket}
            hoveredSpecialist={hoveredSpecialist}
            setHoveredSpecialist={setHoveredSpecialist}
            handleAllocationDrop={handleAllocationDrop}
            handleDualRemovalOpen={handleDualRemovalOpen}
            allocationHistory={allocationHistory}
            loadingHistory={loadingHistory}
            historySearchQuery={historySearchQuery}
            setHistorySearchQuery={setHistorySearchQuery}
            fetchAllocationHistory={fetchAllocationHistory}
            specialistTaskStats={specialistTaskStats}
            reasonsChartRef={reasonsChartRef}
            specialistChartRef={specialistChartRef}
            timelineChartRef={timelineChartRef}
            tasksCompletedChartRef={tasksCompletedChartRef}
            flowChartRef={flowChartRef}
            isDark={isDark}
            styles={styles}
          />
        )}

        {/* Workflow Config Tab */}
        {activeTab === 'workflow' && (
          <WorkflowConfigTab
            workflowTasks={workflowTasks}
            loadingWorkflow={loadingWorkflow}
            expandedTasks={expandedTasks}
            setExpandedTasks={setExpandedTasks}
            expandedSubtasks={expandedSubtasks}
            setExpandedSubtasks={setExpandedSubtasks}
            setWorkflowModal={setWorkflowModal}
            setWorkflowModalData={setWorkflowModalData}
            setWorkflowFormData={setWorkflowFormData}
            setWorkflowError={setWorkflowError}
            setEditingTask={setEditingTask}
            setEditingSubtask={setEditingSubtask}
            setEditingChecklist={setEditingChecklist}
            fetchWorkflowTasks={fetchWorkflowTasks}
            showDeleteConfirm={showDeleteConfirm}
            deleteWorkflowTask={deleteWorkflowTask}
            deleteSubtask={deleteSubtask}
            deleteChecklistItem={deleteChecklistItem}
            isDark={isDark}
            styles={styles}
          />
        )}
      </main>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div style={styles.expandedOverlay} onClick={() => setExpandedChart(null)}>
          <div style={styles.expandedModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.expandedHeader}>
              <div style={styles.expandedTitle}>
                <LuGitBranch size={20} color={colors.primary} />
                Specialist Network Graph
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '12px',
                  color: isDark ? '#64748b' : '#94a3b8',
                }}>
                  Pink = Admin • Purple = Specialists • Blue = Phases
                </span>
                <button
                  style={styles.closeBtn}
                  onClick={() => setExpandedChart(null)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)';
                  }}
                >
                  <LuX size={18} />
                </button>
              </div>
            </div>
            <div style={styles.expandedBody}>
              <div ref={networkGraphExpandedRef} style={styles.expandedChartContainer} />
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingSpecialist ? 'Edit Specialist' : 'Add New Specialist'}
              </h3>
              <button
                style={styles.closeBtn}
                onClick={() => setShowModal(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)';
                }}
              >
                <LuX size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {formError && (
                <div style={styles.error}>
                  <LuTriangleAlert size={16} />
                  {formError}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Username</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingSpecialist}
                  placeholder="Enter username"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Password {editingSpecialist && '(leave blank to keep current)'}
                </label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    style={{ ...styles.input, paddingRight: '44px' }}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingSpecialist ? 'New password' : 'Enter password'}
                  />
                  <button
                    type="button"
                    style={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email (optional)</label>
                <input
                  type="email"
                  style={styles.input}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>

              {/* Specialty Types - Multi-select */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Specialty Types
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    color: isDark ? '#64748b' : '#94a3b8',
                    fontWeight: '400',
                  }}>
                    (Select all that apply)
                  </span>
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  marginTop: '8px',
                }}>
                  {SPECIALTY_TYPES.map((type) => {
                    const isSelected = formData.specialty_types?.includes(type);
                    return (
                      <label
                        key={type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: isSelected
                            ? `${colors.chaseBlue}15`
                            : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                          border: `2px solid ${isSelected ? colors.chaseBlue : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...(formData.specialty_types || []), type]
                              : (formData.specialty_types || []).filter(t => t !== type);
                            setFormData({
                              ...formData,
                              specialty_types: newTypes,
                              specialty_type: newTypes[0] || 'NOT_ALLOCATED',
                            });
                          }}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: colors.chaseBlue,
                          }}
                        />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: isSelected ? '600' : '500',
                          color: isSelected
                            ? colors.chaseBlue
                            : (isDark ? '#94a3b8' : '#64748b'),
                        }}>
                          {type.replace('_', ' ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {formData.specialty_types?.length === 0 && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: colors.warning,
                  }}>
                    Please select at least one specialty type
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  style={styles.select}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="specialist">Specialist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <LuSave size={16} />
                )}
                {editingSpecialist ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reallocation Modal */}
      {reallocationModal && reallocationData && (
        <div style={styles.reallocationOverlay} onClick={handleReallocationCancel}>
          <div style={styles.reallocationModal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={styles.reallocationHeader}>
              <div style={styles.reallocationTitle}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${colors.orange} 0%, #ea580c 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <LuTriangleAlert size={20} color="#fff" />
                </div>
                Specialist Reallocation
              </div>
              <button
                style={styles.closeBtn}
                onClick={handleReallocationCancel}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)';
                }}
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={styles.reallocationBody}>
              {/* Step 1: Warning */}
              {reallocationStep === 1 && (
                <>
                  <div style={styles.warningBox}>
                    <div style={styles.warningIcon}>
                      <LuCircleAlert size={24} color="#fff" />
                    </div>
                    <div style={styles.warningContent}>
                      <div style={styles.warningTitle}>Active Tasks Detected</div>
                      <div style={styles.warningText}>
                        {loadingTasks ? (
                          <span>Loading tasks...</span>
                        ) : (
                          <>
                            This specialist has <strong>{specialistTasks.length} active task{specialistTasks.length !== 1 ? 's' : ''}</strong> assigned to them.
                            {specialistTasks.length > 0 && ' Moving them to "Not Allocated" will require reassigning these tasks to other specialists.'}
                            {specialistTasks.length === 0 && ' However, no active tasks were found in the system. You can proceed directly.'}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={styles.specialistCard}>
                    <div style={styles.specialistAvatarLarge}>
                      {reallocationData.specialist.full_name?.charAt(0)?.toUpperCase() ||
                       reallocationData.specialist.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                        {reallocationData.specialist.full_name || reallocationData.specialist.username}
                      </div>
                      <div style={{ fontSize: '14px', color: isDark ? '#64748b' : '#94a3b8', marginTop: '4px' }}>
                        Currently in: <strong style={{ color: colors.chaseBlue }}>{reallocationData.currentPhase?.replace('_', ' ')}</strong>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '10px',
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: `${colors.warning}20`,
                          color: colors.warning,
                        }}>
                          <LuClock size={14} />
                          {reallocationData.specialist.pending_tasks_count || 0} Pending
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: `${colors.chaseBlue}20`,
                          color: colors.chaseBlue,
                        }}>
                          <LuCirclePlay size={14} />
                          {reallocationData.specialist.in_progress_tasks_count || 0} In Progress
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '8px' }}>
                      What happens next?
                    </div>
                    <div style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', lineHeight: '1.6' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: colors.chaseBlue,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}>1</span>
                        <span>Reassign tasks to other specialists in the same phase</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: colors.chaseBlue,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}>2</span>
                        <span>Select a reason for the reallocation</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: colors.chaseBlue,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}>3</span>
                        <span>Confirm and move specialist to "Not Allocated"</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Reassign Tasks */}
              {reallocationStep === 2 && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b', marginBottom: '6px' }}>
                      Reassign Tasks
                    </div>
                    <div style={{ fontSize: '14px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Drag tasks to other specialists in <strong style={{ color: colors.chaseBlue }}>{reallocationData.currentPhase?.replace('_', ' ')}</strong> phase
                    </div>
                  </div>

                  <div style={styles.taskReassignArea}>
                    {/* Tasks to reassign */}
                    <div style={styles.taskList}>
                      <div style={styles.taskListTitle}>
                        <LuClipboardList size={14} />
                        Tasks to Reassign ({specialistTasks.filter(t => !taskReassignments[t.id]).length} remaining)
                      </div>
                      {loadingTasks ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: isDark ? '#64748b' : '#94a3b8' }}>
                          <LuRefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                          <div style={{ marginTop: '8px' }}>Loading tasks...</div>
                        </div>
                      ) : (
                        <>
                          {specialistTasks.filter(task => !taskReassignments[task.id]).map((task) => (
                            <div
                              key={task.id}
                              draggable
                              style={{
                                ...styles.taskItem,
                                ...(draggedTask === task.id ? styles.taskItemDragging : {}),
                              }}
                              onDragStart={(e) => {
                                setDraggedTask(task.id);
                                e.dataTransfer.setData('taskId', task.id.toString());
                              }}
                              onDragEnd={() => setDraggedTask(null)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                  App #{task.application_id}
                                </div>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: task.status === 'ASSIGNED' ? `${colors.warning}20` : `${colors.chaseBlue}20`,
                                  color: task.status === 'ASSIGNED' ? colors.warning : colors.chaseBlue,
                                }}>
                                  {task.status === 'ASSIGNED' ? 'Pending' : 'In Progress'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8', marginTop: '4px' }}>
                                {task.phase?.replace('_', ' ')} Phase
                              </div>
                            </div>
                          ))}
                          {specialistTasks.length > 0 && specialistTasks.filter(t => !taskReassignments[t.id]).length === 0 && (
                            <div style={{
                              textAlign: 'center',
                              padding: '20px',
                              color: colors.success,
                              fontSize: '14px',
                              fontWeight: '600',
                            }}>
                              <LuCircleCheck size={24} style={{ marginBottom: '8px' }} />
                              <div>All tasks reassigned!</div>
                            </div>
                          )}
                          {specialistTasks.length === 0 && (
                            <div style={{
                              textAlign: 'center',
                              padding: '20px',
                              color: isDark ? '#64748b' : '#94a3b8',
                              fontSize: '13px',
                            }}>
                              No active tasks found
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Target specialists */}
                    <div style={styles.taskList}>
                      <div style={styles.taskListTitle}>
                        <LuUsers size={14} />
                        Available Specialists
                      </div>
                      {specialists
                        .filter(s =>
                          s.role !== 'admin' &&
                          s.id !== reallocationData.specialist.id &&
                          s.specialty_type === reallocationData.currentPhase
                        )
                        .map((targetSpec) => {
                          const assignedTasks = Object.entries(taskReassignments)
                            .filter(([_, specId]) => specId === targetSpec.id)
                            .map(([taskId]) => taskId);
                          const isOver = dragOverSpecialist === targetSpec.id;

                          return (
                            <div
                              key={targetSpec.id}
                              style={{
                                ...styles.targetSpecialistCard,
                                ...(isOver ? styles.targetSpecialistCardOver : {}),
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverSpecialist(targetSpec.id);
                              }}
                              onDragLeave={() => setDragOverSpecialist(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                const taskId = e.dataTransfer.getData('taskId');
                                if (taskId) {
                                  const taskIdNum = parseInt(taskId);
                                  const task = specialistTasks.find(t => t.id === taskIdNum);
                                  const taskPhase = task?.phase || reallocationData.currentPhase;
                                  const targetSpecTypes = targetSpec.specialty_types || [];

                                  // Validate specialist is certified for this task's phase
                                  if (targetSpecTypes.length > 0 && !targetSpecTypes.includes(taskPhase)) {
                                    setCertificationError({
                                      specialistName: targetSpec.full_name || targetSpec.username,
                                      targetPhase: taskPhase,
                                      specialtyTypes: targetSpecTypes,
                                    });
                                    setDragOverSpecialist(null);
                                    setDraggedTask(null);
                                    return;
                                  }

                                  setTaskReassignments(prev => ({
                                    ...prev,
                                    [taskIdNum]: targetSpec.id,
                                  }));
                                }
                                setDragOverSpecialist(null);
                                setDraggedTask(null);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  ...styles.specialistAvatar,
                                  width: '32px',
                                  height: '32px',
                                  fontSize: '12px',
                                }}>
                                  {targetSpec.full_name?.charAt(0)?.toUpperCase() || targetSpec.username?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                    {targetSpec.full_name || targetSpec.username}
                                  </div>
                                  <div style={{ fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8' }}>
                                    {(targetSpec.pending_tasks_count || 0) + (targetSpec.in_progress_tasks_count || 0)} current tasks
                                  </div>
                                </div>
                              </div>
                              {assignedTasks.length > 0 && (
                                <div style={styles.assignedTaskBadge}>
                                  <LuCircleCheck size={12} />
                                  {assignedTasks.length} task{assignedTasks.length !== 1 ? 's' : ''} assigned
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {specialists.filter(s =>
                        s.role !== 'admin' &&
                        s.id !== reallocationData.specialist.id &&
                        s.specialty_type === reallocationData.currentPhase
                      ).length === 0 && (
                        <div style={{
                          textAlign: 'center',
                          padding: '20px',
                          color: isDark ? '#64748b' : '#94a3b8',
                          fontSize: '13px',
                        }}>
                          No other specialists in this phase.
                          <br />
                          <span style={{ color: colors.warning }}>Tasks will remain unassigned.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Select Reason */}
              {reallocationStep === 3 && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#1e293b', marginBottom: '6px' }}>
                      Select Reason for Reallocation
                    </div>
                    <div style={{ fontSize: '14px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      This will be logged for record keeping and auditing purposes
                    </div>
                  </div>

                  <div style={styles.reasonGrid}>
                    {REALLOCATION_REASONS.map((reason) => (
                      <div
                        key={reason.id}
                        style={{
                          ...styles.reasonCard,
                          ...(reallocationReason === reason.id ? styles.reasonCardSelected : {}),
                        }}
                        onClick={() => setReallocationReason(reason.id)}
                      >
                        <span style={styles.reasonIcon}>{reason.icon}</span>
                        <span style={styles.reasonLabel}>{reason.label}</span>
                        {reallocationReason === reason.id && (
                          <LuCircleCheck size={18} color={colors.chaseBlue} style={{ marginLeft: 'auto' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: isDark ? 'rgba(10, 75, 148, 0.1)' : 'rgba(10, 75, 148, 0.05)',
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? 'rgba(10, 75, 148, 0.2)' : 'rgba(10, 75, 148, 0.1)'}`,
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '10px' }}>
                      Summary
                    </div>
                    <div style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', lineHeight: '1.8' }}>
                      <div>
                        <strong>{reallocationData.specialist.full_name}</strong> will be moved to <strong style={{ color: colors.orange }}>Not Allocated</strong>
                      </div>
                      <div>
                        <strong>{Object.keys(taskReassignments).length}</strong> task{Object.keys(taskReassignments).length !== 1 ? 's' : ''} will be reassigned
                      </div>
                      {reallocationReason && (
                        <div>
                          Reason: <strong style={{ color: colors.chaseBlue }}>{REALLOCATION_REASONS.find(r => r.id === reallocationReason)?.label}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={styles.reallocationFooter}>
              <div style={styles.stepIndicator}>
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    style={{
                      ...styles.stepDot,
                      ...(reallocationStep === step ? styles.stepDotActive : {}),
                      ...(reallocationStep > step ? styles.stepDotCompleted : {}),
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {reallocationStep > 1 && (
                  <button
                    style={{ ...styles.modalActionBtn, ...styles.actionBtnSecondary }}
                    onClick={() => setReallocationStep(prev => prev - 1)}
                  >
                    <LuChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                    Back
                  </button>
                )}

                {reallocationStep === 1 && (
                  <>
                    <button
                      style={{ ...styles.modalActionBtn, ...styles.actionBtnSecondary }}
                      onClick={handleReallocationCancel}
                    >
                      Cancel
                    </button>
                    <button
                      style={{
                        ...styles.modalActionBtn,
                        ...styles.actionBtnDanger,
                        opacity: loadingTasks ? 0.5 : 1,
                        cursor: loadingTasks ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => {
                        // Skip Step 2 if no tasks to reassign
                        if (specialistTasks.length === 0) {
                          setReallocationStep(3);
                        } else {
                          setReallocationStep(2);
                        }
                      }}
                      disabled={loadingTasks}
                    >
                      {loadingTasks ? 'Loading...' : 'Continue'}
                      <LuChevronRight size={16} />
                    </button>
                  </>
                )}

                {reallocationStep === 2 && (
                  <button
                    style={{ ...styles.modalActionBtn, ...styles.actionBtnPrimary }}
                    onClick={() => setReallocationStep(3)}
                  >
                    Next: Select Reason
                    <LuChevronRight size={16} />
                  </button>
                )}

                {reallocationStep === 3 && (
                  <button
                    style={{
                      ...styles.modalActionBtn,
                      ...styles.actionBtnPrimary,
                      opacity: !reallocationReason ? 0.5 : 1,
                      cursor: !reallocationReason ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleReallocationConfirm}
                    disabled={!reallocationReason || updatingAllocation}
                  >
                    {updatingAllocation ? (
                      <>
                        <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <LuCircleCheck size={16} />
                        Confirm Reallocation
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specialist Certifications Hover Tooltip */}
      {hoveredSpecialist && (
        <div
          style={{
            position: 'fixed',
            left: hoveredSpecialist.x,
            top: hoveredSpecialist.y - 10,
            transform: 'translate(-50%, -100%)',
            background: isDark ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: isDark
              ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)'
              : '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            zIndex: 9999,
            pointerEvents: 'none',
            minWidth: '200px',
            maxWidth: '320px',
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `8px solid ${isDark ? '#0f172a' : '#f8fafc'}`,
            }}
          />

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: hoveredSpecialist.specialist.dual_phase
                ? 'linear-gradient(135deg, #185FA5 0%, #0d9488 100%)'
                : `linear-gradient(135deg, ${colors.chaseBlue} 0%, #0a4b94 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              position: 'relative',
            }}>
              {hoveredSpecialist.specialist.full_name?.charAt(0)?.toUpperCase() ||
               hoveredSpecialist.specialist.username?.charAt(0)?.toUpperCase() || '?'}
              {hoveredSpecialist.specialist.dual_phase && (
                <div style={{
                  position: 'absolute',
                  bottom: '-3px',
                  right: '-3px',
                  display: 'flex',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#185FA5', border: '1.5px solid #fff' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488', border: '1.5px solid #fff', marginLeft: '-3px' }} />
                </div>
              )}
            </div>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                }}>
                  {hoveredSpecialist.specialist.full_name || hoveredSpecialist.specialist.username}
                </span>
                {hoveredSpecialist.specialist.dual_phase && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(24, 95, 165, 0.2)',
                    color: '#185FA5',
                  }}>
                    DUAL
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '11px',
                color: isDark ? '#64748b' : '#94a3b8',
              }}>
                {hoveredSpecialist.specialist.email || 'Specialist'}
              </div>
            </div>
          </div>

          {/* Active Phases (for dual-phase specialists) */}
          {hoveredSpecialist.specialist.dual_phase && hoveredSpecialist.specialist.dual_phases && (
            <>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: isDark ? '#94a3b8' : '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                Active In
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {hoveredSpecialist.specialist.dual_phases.map((phase, idx) => (
                  <span
                    key={phase}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      background: idx === 0 ? 'rgba(24, 95, 165, 0.15)' : 'rgba(13, 148, 136, 0.15)',
                      color: idx === 0 ? '#185FA5' : '#0d9488',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    <LuCircle size={8} fill={idx === 0 ? '#185FA5' : '#0d9488'} />
                    {phase.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Certifications */}
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: isDark ? '#94a3b8' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}>
            Certifications
          </div>

          {(hoveredSpecialist.specialist.specialty_types || []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(hoveredSpecialist.specialist.specialty_types || []).map((type) => (
                <span
                  key={type}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: isDark ? '#34d399' : '#059669',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  <LuCircleCheck size={12} />
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              color: isDark ? '#64748b' : '#94a3b8',
              fontStyle: 'italic',
            }}>
              No certifications - can work on any phase
            </div>
          )}
        </div>
      )}

      {/* Certification Error Modal */}
      {certificationError && (
        <div style={styles.reallocationOverlay} onClick={() => setCertificationError(null)}>
          <div
            style={{
              background: isDark ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '18px',
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#1e293b',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <LuCircleX size={20} color="#fff" />
                </div>
                Certification Required
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setCertificationError(null)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)';
                }}
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '28px' }}>
              <div style={{
                background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`,
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <LuTriangleAlert size={24} color="#fff" />
                  </div>
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#ef4444',
                      marginBottom: '8px',
                    }}>
                      Cannot Assign to This Phase
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: isDark ? '#e2e8f0' : '#374151',
                      lineHeight: '1.6',
                    }}>
                      <strong style={{ color: isDark ? '#ffffff' : '#111827' }}>{certificationError.specialistName}</strong> is not certified for{' '}
                      <strong style={{ color: isDark ? '#60a5fa' : '#0a4b94' }}>{certificationError.targetPhase.replace(/_/g, ' ')}</strong>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Certifications */}
              <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '14px',
                }}>
                  Current Certifications
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  {certificationError.specialtyTypes.map((type) => (
                    <span
                      key={type}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                        color: isDark ? '#34d399' : '#059669',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      <LuCircleCheck size={14} />
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px 28px',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.chaseBlue}`,
                  background: isDark ? `${colors.chaseBlue}20` : 'transparent',
                  color: isDark ? '#ffffff' : '#1e293b',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onClick={() => setCertificationError(null)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase Transfer Modal */}
      {phaseTransferModal && phaseTransferData && (
        <div style={styles.reallocationOverlay} onClick={handlePhaseTransferCancel}>
          <div
            style={{
              background: isDark ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: phaseTransferOption === 'dual' && phaseTransferStep > 1
                ? 'linear-gradient(135deg, #BA7517 0%, #EF9F27 100%)'
                : 'linear-gradient(135deg, #185FA5 0%, #2980b9 100%)',
              padding: '20px 28px',
              position: 'relative',
            }}>
              {/* Step indicator dots - top right */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '28px',
                display: 'flex',
                gap: '6px',
              }}>
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      opacity: phaseTransferStep >= step ? 1 : 0.35,
                      transition: 'opacity 0.3s',
                    }}
                  />
                ))}
              </div>

              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '6px',
              }}>
                Phase Transfer
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#ffffff',
              }}>
                Moving {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username} to {phaseTransferData.targetPhase.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Body */}
            <div style={{
              padding: '24px 28px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Step 1: Path Selection */}
              {phaseTransferStep === 1 && (
                <>
                  {/* Info banner */}
                  <div style={{
                    background: isDark ? 'rgba(24, 95, 165, 0.15)' : 'rgba(24, 95, 165, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '24px',
                    border: `1px solid ${isDark ? 'rgba(24, 95, 165, 0.3)' : 'rgba(24, 95, 165, 0.2)'}`,
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: isDark ? '#93c5fd' : '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <LuCircleCheck size={16} />
                      <span>
                        <strong>{phaseTransferData.specialist.full_name || phaseTransferData.specialist.username}</strong> is certified in{' '}
                        <strong>{phaseTransferData.currentPhase.replace(/_/g, ' ')}</strong> and{' '}
                        <strong>{phaseTransferData.targetPhase.replace(/_/g, ' ')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Two-column task summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    {/* Current phase card (amber) */}
                    <div style={{
                      background: '#FAEEDA',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '2px solid #EF9F27',
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#BA7517',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '12px',
                      }}>
                        Current · {phaseTransferData.currentPhase.replace(/_/g, ' ')}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginBottom: '12px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                      }}>
                        {phaseTransferData.tasks.map((task) => (
                          <div
                            key={task.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(255,255,255,0.7)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>
                              {task.application_id || `Task #${task.id}`}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: task.status === 'IN_PROGRESS' ? '#fbbf24' : '#fcd34d',
                              color: '#78350f',
                            }}>
                              {task.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#92400e',
                      }}>
                        {phaseTransferData.tasks.length} active task{phaseTransferData.tasks.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Target phase card (secondary) */}
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: `2px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '12px',
                      }}>
                        New · {phaseTransferData.targetPhase.replace(/_/g, ' ')}
                      </div>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDark ? '#475569' : '#94a3b8',
                      }}>
                        <LuClock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} strokeDasharray="4 2" />
                        <span style={{ fontSize: '12px', textAlign: 'center' }}>
                          No tasks yet<br />
                          <span style={{ fontSize: '11px', opacity: 0.7 }}>New tasks will queue here</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Path selection radio cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Option A: Reassign tasks */}
                    <div
                      onClick={() => setPhaseTransferOption('reassign')}
                      style={{
                        borderRadius: '12px',
                        padding: '18px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: phaseTransferOption === 'reassign'
                          ? '2px solid #185FA5'
                          : `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: phaseTransferOption === 'reassign'
                          ? (isDark ? 'rgba(24, 95, 165, 0.15)' : 'rgba(24, 95, 165, 0.05)')
                          : (isDark ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        {/* Radio dot */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: phaseTransferOption === 'reassign'
                            ? '2px solid #185FA5'
                            : `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}>
                          {phaseTransferOption === 'reassign' && (
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#185FA5',
                            }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: isDark ? '#f1f5f9' : '#1e293b',
                            marginBottom: '4px',
                          }}>
                            Reassign {phaseTransferData.currentPhase.replace(/_/g, ' ')} tasks to another specialist
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}>
                            {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username} moves fully to {phaseTransferData.targetPhase.replace(/_/g, ' ')}. You'll pick who takes each task.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hint for Option A */}
                    {phaseTransferOption === 'reassign' && (
                      <div style={{
                        borderLeft: '3px solid #185FA5',
                        paddingLeft: '14px',
                        marginLeft: '10px',
                        fontSize: '12px',
                        color: isDark ? '#93c5fd' : '#1e40af',
                      }}>
                        Next step: pick a certified {phaseTransferData.currentPhase.replace(/_/g, ' ')} specialist to take each of the {phaseTransferData.tasks.length} tasks, then confirm the move.
                      </div>
                    )}

                    {/* Option B: Dual phase */}
                    <div
                      onClick={() => setPhaseTransferOption('dual')}
                      style={{
                        borderRadius: '12px',
                        padding: '18px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: phaseTransferOption === 'dual'
                          ? '2px solid #EF9F27'
                          : `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: phaseTransferOption === 'dual'
                          ? '#FAEEDA'
                          : (isDark ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        {/* Radio dot */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: phaseTransferOption === 'dual'
                            ? '2px solid #EF9F27'
                            : `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}>
                          {phaseTransferOption === 'dual' && (
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#EF9F27',
                            }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: phaseTransferOption === 'dual' ? '#92400e' : (isDark ? '#f1f5f9' : '#1e293b'),
                            marginBottom: '4px',
                          }}>
                            Keep tasks — work both phases simultaneously
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: phaseTransferOption === 'dual' ? '#a16207' : (isDark ? '#94a3b8' : '#64748b'),
                            marginBottom: '8px',
                          }}>
                            {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username} stays active in {phaseTransferData.currentPhase.replace(/_/g, ' ')} and gets added to {phaseTransferData.targetPhase.replace(/_/g, ' ')}. Task load will increase.
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}>
                            <LuTriangleAlert size={14} />
                            Current load: {phaseTransferData.tasks.length} tasks · Combined load may slow throughput
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dual-phase preview - Prominent info box */}
                    {phaseTransferOption === 'dual' && (
                      <div style={{
                        background: 'linear-gradient(135deg, #FAEEDA 0%, #FEF3C7 100%)',
                        borderRadius: '12px',
                        padding: '16px 18px',
                        marginTop: '8px',
                        border: '2px solid #EF9F27',
                        boxShadow: '0 4px 12px rgba(239, 159, 39, 0.15)',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                          color: '#92400e',
                          fontWeight: '700',
                          fontSize: '13px',
                        }}>
                          <LuInfo size={16} />
                          Preview: Dual-Phase Chip Appearance
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          background: 'rgba(255,255,255,0.7)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                        }}>
                          {/* Dual avatar preview */}
                          <div style={{ position: 'relative', width: '52px', height: '40px', flexShrink: 0 }}>
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #185FA5 0%, #2980b9 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '14px',
                              fontWeight: '700',
                              border: '3px solid #fff',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }}>
                              {(phaseTransferData.specialist.full_name || phaseTransferData.specialist.username)?.charAt(0)?.toUpperCase()}
                            </div>
                            <div style={{
                              position: 'absolute',
                              left: '20px',
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '14px',
                              fontWeight: '700',
                              border: '3px solid #fff',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }}>
                              {(phaseTransferData.specialist.full_name || phaseTransferData.specialist.username)?.charAt(0)?.toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '700',
                              color: '#78350f',
                              marginBottom: '4px',
                            }}>
                              {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#92400e',
                            }}>
                              Chip will appear in <strong>{phaseTransferData.currentPhase.replace(/_/g, ' ')}</strong> and <strong>{phaseTransferData.targetPhase.replace(/_/g, ' ')}</strong> buckets with a dual-phase badge
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Step 2A: Reassign Tasks */}
              {phaseTransferStep === 2 && phaseTransferOption === 'reassign' && (
                <>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    marginBottom: '20px',
                  }}>
                    Reassign {phaseTransferData.tasks.length} {phaseTransferData.currentPhase.replace(/_/g, ' ')} Tasks
                  </div>

                  {/* Task table */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  }}>
                    {/* Header row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto 1.5fr',
                      gap: '12px',
                      padding: '12px 16px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      fontSize: '11px',
                      fontWeight: '700',
                      color: isDark ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      <div>Task ID</div>
                      <div>Type</div>
                      <div>Priority</div>
                      <div>Assign To</div>
                    </div>

                    {/* Task rows */}
                    {phaseTransferData.tasks.map((task) => {
                      const availableSpecs = getAvailableSpecialistsForPhase(phaseTransferData.currentPhase);
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr auto 1.5fr',
                            gap: '12px',
                            padding: '14px 16px',
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                            alignItems: 'center',
                          }}
                        >
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: isDark ? '#e2e8f0' : '#1e293b',
                          }}>
                            {task.application_id || `#${task.id}`}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}>
                            {task.task_title || 'Phase Task'}
                          </div>
                          <div>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: task.status === 'IN_PROGRESS'
                                ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)')
                                : (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'),
                              color: task.status === 'IN_PROGRESS' ? '#f59e0b' : '#3b82f6',
                            }}>
                              {task.status === 'IN_PROGRESS' ? 'Active' : 'Pending'}
                            </span>
                          </div>
                          <div>
                            <select
                              value={phaseTransferAssignments[task.id] || ''}
                              onChange={(e) => {
                                setPhaseTransferAssignments(prev => ({
                                  ...prev,
                                  [task.id]: parseInt(e.target.value),
                                }));
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: `1px solid ${phaseTransferAssignments[task.id]
                                  ? '#10b981'
                                  : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}`,
                                background: phaseTransferAssignments[task.id]
                                  ? (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)')
                                  : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                                color: isDark ? '#e2e8f0' : '#1e293b',
                                fontSize: '13px',
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                            >
                              <option value="">Select specialist...</option>
                              {availableSpecs.map((spec) => (
                                <option key={spec.id} value={spec.id}>
                                  {spec.full_name || spec.username} ({(spec.pending_tasks_count || 0) + (spec.in_progress_tasks_count || 0)} tasks)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Validation message */}
                  {!allTasksAssigned && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
                      border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
                      fontSize: '13px',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <LuCircleAlert size={16} />
                      Please assign all tasks before continuing ({Object.keys(phaseTransferAssignments).length}/{phaseTransferData.tasks.length} assigned)
                    </div>
                  )}
                </>
              )}

              {/* Step 2B: Dual Phase Confirmation */}
              {phaseTransferStep === 2 && phaseTransferOption === 'dual' && (
                <>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    marginBottom: '20px',
                  }}>
                    Dual-Phase Assignment
                  </div>

                  {/* Visual preview */}
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    justifyContent: 'center',
                    marginBottom: '24px',
                  }}>
                    {/* Current phase bucket preview */}
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px',
                      padding: '16px',
                      minWidth: '180px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                      }}>
                        {phaseTransferData.currentPhase.replace(/_/g, ' ')}
                      </div>
                      {/* Dual-phase chip */}
                      <div style={{
                        background: `linear-gradient(90deg, rgba(24, 95, 165, 0.15) 50%, rgba(13, 148, 136, 0.15) 50%)`,
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #185FA5 0%, #0d9488 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '700',
                          position: 'relative',
                        }}>
                          {(phaseTransferData.specialist.full_name || phaseTransferData.specialist.username)?.charAt(0)?.toUpperCase()}
                          {/* Dual badge */}
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            display: 'flex',
                          }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#185FA5', border: '1px solid #fff' }} />
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488', border: '1px solid #fff', marginLeft: '-3px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                            {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username}
                          </div>
                          <div style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8' }}>
                            {phaseTransferData.tasks.length} tasks
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Target phase bucket preview */}
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px',
                      padding: '16px',
                      minWidth: '180px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                      }}>
                        {phaseTransferData.targetPhase.replace(/_/g, ' ')}
                      </div>
                      {/* Same dual-phase chip */}
                      <div style={{
                        background: `linear-gradient(90deg, rgba(24, 95, 165, 0.15) 50%, rgba(13, 148, 136, 0.15) 50%)`,
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #185FA5 0%, #0d9488 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '700',
                          position: 'relative',
                        }}>
                          {(phaseTransferData.specialist.full_name || phaseTransferData.specialist.username)?.charAt(0)?.toUpperCase()}
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            display: 'flex',
                          }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#185FA5', border: '1px solid #fff' }} />
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488', border: '1px solid #fff', marginLeft: '-3px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                            {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username}
                          </div>
                          <div style={{ fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8' }}>
                            0 tasks
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning banner */}
                  <div style={{
                    background: '#FAEEDA',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #EF9F27',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}>
                      <LuTriangleAlert size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#92400e',
                          marginBottom: '6px',
                        }}>
                          This specialist will appear in both buckets
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: '#a16207',
                        }}>
                          Their task load will increase. Current: <strong>{phaseTransferData.tasks.length} tasks</strong> in {phaseTransferData.currentPhase.replace(/_/g, ' ')} + new tasks from {phaseTransferData.targetPhase.replace(/_/g, ' ')}.
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation */}
              {phaseTransferStep === 3 && (
                <>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    marginBottom: '20px',
                  }}>
                    Confirm Changes
                  </div>

                  {/* Summary list */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}>
                      {/* Main action */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: phaseTransferOption === 'dual' ? '#EF9F27' : '#185FA5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <LuCircleCheck size={16} color="#fff" />
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                        }}>
                          <strong>{phaseTransferData.specialist.full_name || phaseTransferData.specialist.username}</strong>{' '}
                          {phaseTransferOption === 'dual'
                            ? `assigned to both ${phaseTransferData.currentPhase.replace(/_/g, ' ')} and ${phaseTransferData.targetPhase.replace(/_/g, ' ')}`
                            : `moved to ${phaseTransferData.targetPhase.replace(/_/g, ' ')}`
                          }
                        </div>
                      </div>

                      {/* Task reassignments (Option A only) */}
                      {phaseTransferOption === 'reassign' && Object.entries(phaseTransferAssignments).map(([taskId, specId]) => {
                        const task = phaseTransferData.tasks.find(t => t.id === parseInt(taskId));
                        const targetSpec = specialists.find(s => s.id === specId);
                        return (
                          <div
                            key={taskId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              paddingLeft: '40px',
                            }}
                          >
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isDark ? '#64748b' : '#94a3b8',
                            }} />
                            <div style={{
                              fontSize: '13px',
                              color: isDark ? '#94a3b8' : '#64748b',
                            }}>
                              Task <strong style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>{task?.application_id || `#${taskId}`}</strong> → {targetSpec?.full_name || targetSpec?.username}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Specialist chip preview - PROMINENT SECTION */}
                  <div style={{
                    background: phaseTransferOption === 'dual'
                      ? 'linear-gradient(135deg, #FAEEDA 0%, #FEF3C7 100%)'
                      : (isDark ? 'rgba(24, 95, 165, 0.1)' : 'rgba(24, 95, 165, 0.08)'),
                    borderRadius: '14px',
                    padding: '20px',
                    border: phaseTransferOption === 'dual'
                      ? '2px solid #EF9F27'
                      : `2px solid ${isDark ? 'rgba(24, 95, 165, 0.3)' : 'rgba(24, 95, 165, 0.2)'}`,
                    boxShadow: phaseTransferOption === 'dual'
                      ? '0 4px 12px rgba(239, 159, 39, 0.15)'
                      : '0 4px 12px rgba(24, 95, 165, 0.1)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}>
                      <LuEye size={18} color={phaseTransferOption === 'dual' ? '#92400e' : '#185FA5'} />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: phaseTransferOption === 'dual' ? '#92400e' : (isDark ? '#93c5fd' : '#185FA5'),
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        New Chip State Preview
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        background: phaseTransferOption === 'dual'
                          ? `linear-gradient(90deg, rgba(24, 95, 165, 0.15) 50%, rgba(13, 148, 136, 0.15) 50%)`
                          : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'),
                        borderRadius: '12px',
                        padding: '18px 24px',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        border: `2px solid ${phaseTransferOption === 'dual' ? 'rgba(239, 159, 39, 0.3)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '14px',
                          background: phaseTransferOption === 'dual'
                            ? 'linear-gradient(135deg, #185FA5 0%, #0d9488 100%)'
                            : 'linear-gradient(135deg, #185FA5 0%, #2980b9 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '20px',
                          fontWeight: '700',
                          position: 'relative',
                          boxShadow: '0 4px 12px rgba(24, 95, 165, 0.3)',
                        }}>
                          {(phaseTransferData.specialist.full_name || phaseTransferData.specialist.username)?.charAt(0)?.toUpperCase()}
                          {phaseTransferOption === 'dual' && (
                            <div style={{
                              position: 'absolute',
                              bottom: '-6px',
                              right: '-6px',
                              display: 'flex',
                              background: '#fff',
                              borderRadius: '10px',
                              padding: '2px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#185FA5' }} />
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0d9488', marginLeft: '-3px' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: phaseTransferOption === 'dual' ? '#78350f' : (isDark ? '#e2e8f0' : '#1e293b'),
                          }}>
                            {phaseTransferData.specialist.full_name || phaseTransferData.specialist.username}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: phaseTransferOption === 'dual' ? '#92400e' : (isDark ? '#64748b' : '#64748b'),
                            marginTop: '4px',
                            fontWeight: '600',
                          }}>
                            {phaseTransferOption === 'dual'
                              ? `${phaseTransferData.currentPhase.replace(/_/g, ' ')} + ${phaseTransferData.targetPhase.replace(/_/g, ' ')}`
                              : phaseTransferData.targetPhase.replace(/_/g, ' ')
                            }
                          </div>
                        </div>
                        {phaseTransferOption === 'dual' && (
                          <div style={{
                            marginTop: '6px',
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #EF9F27 0%, #f59e0b 100%)',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            Dual-Phase Badge
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px 28px',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={handlePhaseTransferCancel}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                {phaseTransferStep > 1 && (
                  <button
                    onClick={handlePhaseTransferBack}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                      background: 'transparent',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ← Back
                  </button>
                )}

                {phaseTransferStep < 3 && (
                  <button
                    onClick={handlePhaseTransferContinue}
                    disabled={phaseTransferStep === 2 && phaseTransferOption === 'reassign' && !allTasksAssigned}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: phaseTransferOption === 'dual' && phaseTransferStep > 1
                        ? 'linear-gradient(135deg, #BA7517 0%, #EF9F27 100%)'
                        : 'linear-gradient(135deg, #185FA5 0%, #2980b9 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (phaseTransferStep === 2 && phaseTransferOption === 'reassign' && !allTasksAssigned) ? 'not-allowed' : 'pointer',
                      opacity: (phaseTransferStep === 2 && phaseTransferOption === 'reassign' && !allTasksAssigned) ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: phaseTransferOption === 'dual' && phaseTransferStep > 1
                        ? '0 4px 12px rgba(186, 117, 23, 0.3)'
                        : '0 4px 12px rgba(24, 95, 165, 0.3)',
                    }}
                  >
                    {phaseTransferStep === 1 && (
                      <>
                        Continue · {phaseTransferOption === 'reassign' ? 'Reassign tasks' : 'Dual-phase assignment'}
                        <LuChevronRight size={16} />
                      </>
                    )}
                    {phaseTransferStep === 2 && phaseTransferOption === 'reassign' && (
                      <>
                        Review & Confirm
                        <LuChevronRight size={16} />
                      </>
                    )}
                    {phaseTransferStep === 2 && phaseTransferOption === 'dual' && (
                      <>
                        Confirm Dual Assignment
                        <LuChevronRight size={16} />
                      </>
                    )}
                  </button>
                )}

                {phaseTransferStep === 3 && (
                  <button
                    onClick={handlePhaseTransferConfirm}
                    disabled={phaseTransferLoading}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: phaseTransferOption === 'dual'
                        ? 'linear-gradient(135deg, #BA7517 0%, #EF9F27 100%)'
                        : 'linear-gradient(135deg, #185FA5 0%, #2980b9 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: phaseTransferLoading ? 'not-allowed' : 'pointer',
                      opacity: phaseTransferLoading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: phaseTransferOption === 'dual'
                        ? '0 4px 12px rgba(186, 117, 23, 0.3)'
                        : '0 4px 12px rgba(24, 95, 165, 0.3)',
                    }}
                  >
                    {phaseTransferLoading ? (
                      <>
                        <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <LuCircleCheck size={16} />
                        Confirm Move
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Phase Removal Modal */}
      {dualRemovalModal && dualRemovalData && (
        <div style={styles.reallocationOverlay} onClick={handleDualRemovalCancel}>
          <div
            style={{
              background: isDark ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                : '0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              padding: '20px 28px',
              position: 'relative',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <LuUserX size={24} color="#fff" />
                </div>
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#fff',
                  }}>
                    Remove Dual-Phase Assignment
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.8)',
                  }}>
                    {dualRemovalData.specialist.full_name || dualRemovalData.specialist.username} · Exiting {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '16px',
              }}>
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: dualRemovalStep >= step
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(255,255,255,0.2)',
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{
              padding: '24px 28px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Step 1: Summary */}
              {dualRemovalStep === 1 && (
                <>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    marginBottom: '16px',
                  }}>
                    Remove from {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')}
                  </div>

                  {/* Info banner */}
                  <div style={{
                    background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}>
                      <LuTriangleAlert size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: isDark ? '#fca5a5' : '#b91c1c',
                          marginBottom: '4px',
                        }}>
                          {dualRemovalData.specialist.full_name || dualRemovalData.specialist.username} will be removed from {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: isDark ? '#fca5a5' : '#dc2626',
                        }}>
                          They will remain in <strong>{dualRemovalData.phaseToKeep?.replace(/_/g, ' ')}</strong> only.
                          {dualRemovalData.tasksInRemovedPhase?.length > 0 && (
                            <> {dualRemovalData.tasksInRemovedPhase.length} task{dualRemovalData.tasksInRemovedPhase.length !== 1 ? 's' : ''} in {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')} will need to be offboarded.</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current assignment preview */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    justifyContent: 'center',
                    marginBottom: '20px',
                  }}>
                    {/* Before */}
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      flex: 1,
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                      }}>
                        Current (Dual)
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                      }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#185FA5',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {dualRemovalData.phases[0]?.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#0d9488',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {dualRemovalData.phases[1]?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <LuChevronRight size={24} color={isDark ? '#64748b' : '#94a3b8'} />

                    {/* After */}
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      flex: 1,
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                      }}>
                        After Removal
                      </div>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: dualRemovalData.phaseToKeep === dualRemovalData.phases[0] ? '#185FA5' : '#0d9488',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {dualRemovalData.phaseToKeep?.replace(/_/g, ' ')} only
                      </span>
                    </div>
                  </div>

                  {/* Tasks preview */}
                  {dualRemovalData.tasksInRemovedPhase?.length > 0 && (
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <LuClipboardList size={16} />
                        Tasks to Offboard from {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        {dualRemovalData.tasksInRemovedPhase.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span style={{ fontSize: '13px', color: isDark ? '#e2e8f0' : '#1e293b', fontWeight: '500' }}>
                              {task.application_id || `Task #${task.id}`}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: task.status === 'IN_PROGRESS' ? '#fbbf24' : '#94a3b8',
                              color: task.status === 'IN_PROGRESS' ? '#78350f' : '#fff',
                            }}>
                              {task.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                        {dualRemovalData.tasksInRemovedPhase.length > 5 && (
                          <div style={{
                            fontSize: '12px',
                            color: isDark ? '#64748b' : '#94a3b8',
                            textAlign: 'center',
                            padding: '8px',
                          }}>
                            +{dualRemovalData.tasksInRemovedPhase.length - 5} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step 2: Offboard Tasks */}
              {dualRemovalStep === 2 && (
                <>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    marginBottom: '6px',
                  }}>
                    Offboard {dualRemovalData.tasksInRemovedPhase?.length || 0} Tasks
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: isDark ? '#94a3b8' : '#64748b',
                    marginBottom: '20px',
                  }}>
                    Reassign tasks to other {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')} specialists or leave unassigned
                  </div>

                  {dualRemovalData.tasksInRemovedPhase?.length === 0 ? (
                    <div style={{
                      background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                      borderRadius: '12px',
                      padding: '24px',
                      textAlign: 'center',
                    }}>
                      <LuCircleCheck size={32} color="#22c55e" style={{ marginBottom: '12px' }} />
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isDark ? '#86efac' : '#15803d',
                      }}>
                        No tasks to offboard
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: isDark ? '#4ade80' : '#16a34a',
                        marginTop: '4px',
                      }}>
                        {dualRemovalData.specialist.full_name || dualRemovalData.specialist.username} has no active tasks in {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {dualRemovalData.tasksInRemovedPhase?.map((task) => {
                        const availableSpecs = getAvailableSpecialistsForDualRemoval(dualRemovalData.phaseToRemove);
                        const selectedSpecId = dualRemovalAssignments[task.id];

                        return (
                          <div
                            key={task.id}
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                              borderRadius: '12px',
                              padding: '14px 16px',
                              border: `1px solid ${selectedSpecId !== undefined ? (isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.25)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '10px',
                            }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDark ? '#e2e8f0' : '#1e293b',
                              }}>
                                {task.application_id || `Task #${task.id}`}
                              </div>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: task.status === 'IN_PROGRESS' ? '#fbbf24' : '#94a3b8',
                                color: task.status === 'IN_PROGRESS' ? '#78350f' : '#fff',
                              }}>
                                {task.status?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <select
                              value={selectedSpecId ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setDualRemovalAssignments(prev => ({
                                  ...prev,
                                  [task.id]: value === '' ? undefined : (value === 'unassign' ? null : parseInt(value)),
                                }));
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                                color: isDark ? '#e2e8f0' : '#1e293b',
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">Select action...</option>
                              <option value="unassign">Leave unassigned (return to queue)</option>
                              {availableSpecs.map((spec) => (
                                <option key={spec.id} value={spec.id}>
                                  Reassign to {spec.full_name || spec.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Confirm */}
              {dualRemovalStep === 3 && (
                <>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    marginBottom: '20px',
                  }}>
                    Confirm Removal
                  </div>

                  {/* Summary */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}>
                      {/* Main action */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <LuUserX size={16} color="#fff" />
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                        }}>
                          <strong>{dualRemovalData.specialist.full_name || dualRemovalData.specialist.username}</strong> will be removed from {dualRemovalData.phaseToRemove?.replace(/_/g, ' ')}
                        </div>
                      </div>

                      {/* Remaining phase */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <LuCircleCheck size={16} color="#fff" />
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                        }}>
                          Stays in <strong>{dualRemovalData.phaseToKeep?.replace(/_/g, ' ')}</strong> only
                        </div>
                      </div>

                      {/* Task summary */}
                      {dualRemovalData.tasksInRemovedPhase?.length > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          paddingTop: '10px',
                          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                        }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#185FA5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <LuClipboardList size={16} color="#fff" />
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: isDark ? '#e2e8f0' : '#1e293b',
                          }}>
                            <strong>{dualRemovalData.tasksInRemovedPhase.length}</strong> task{dualRemovalData.tasksInRemovedPhase.length !== 1 ? 's' : ''} will be offboarded
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* New chip state preview */}
                  <div style={{
                    background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                    borderRadius: '14px',
                    padding: '20px',
                    border: `2px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.25)'}`,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}>
                      <LuEye size={18} color="#22c55e" />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: isDark ? '#86efac' : '#15803d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        New Chip State
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                        borderRadius: '12px',
                        padding: '14px 20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: dualRemovalData.phaseToKeep === dualRemovalData.phases[0]
                            ? 'linear-gradient(135deg, #185FA5 0%, #2980b9 100%)'
                            : 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: '700',
                        }}>
                          {(dualRemovalData.specialist.full_name || dualRemovalData.specialist.username)?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: isDark ? '#e2e8f0' : '#1e293b',
                          }}>
                            {dualRemovalData.specialist.full_name || dualRemovalData.specialist.username}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: isDark ? '#64748b' : '#94a3b8',
                          }}>
                            {dualRemovalData.phaseToKeep?.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
            }}>
              <button
                onClick={handleDualRemovalCancel}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                {dualRemovalStep > 1 && (
                  <button
                    onClick={handleDualRemovalBack}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                      background: 'transparent',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ← Back
                  </button>
                )}

                {dualRemovalStep < 3 && (
                  <button
                    onClick={handleDualRemovalContinue}
                    disabled={dualRemovalStep === 2 && !allDualRemovalTasksHandled}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (dualRemovalStep === 2 && !allDualRemovalTasksHandled) ? 'not-allowed' : 'pointer',
                      opacity: (dualRemovalStep === 2 && !allDualRemovalTasksHandled) ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    {dualRemovalStep === 1 && (
                      <>
                        {dualRemovalData.tasksInRemovedPhase?.length > 0 ? 'Offboard Tasks' : 'Skip to Confirm'}
                        <LuChevronRight size={16} />
                      </>
                    )}
                    {dualRemovalStep === 2 && (
                      <>
                        Review & Confirm
                        <LuChevronRight size={16} />
                      </>
                    )}
                  </button>
                )}

                {dualRemovalStep === 3 && (
                  <button
                    onClick={handleDualRemovalConfirm}
                    disabled={dualRemovalLoading}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: dualRemovalLoading ? 'not-allowed' : 'pointer',
                      opacity: dualRemovalLoading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    {dualRemovalLoading ? (
                      <>
                        <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <LuUserX size={16} />
                        Remove Dual-Phase
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Configuration Modal */}
      {workflowModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setWorkflowModal(null);
            setEditingTask(null);
            setEditingSubtask(null);
            setEditingChecklist(null);
          }}
        >
          <div
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #1a1f35 0%, #0d1526 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '16px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: isDark ? '#e2e8f0' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                {workflowModal === 'task' && (
                  <>
                    <LuWorkflow size={20} color={colors.chaseBlue} />
                    {editingTask ? 'Edit Task' : 'Add New Task'}
                  </>
                )}
                {workflowModal === 'subtask' && (
                  <>
                    <LuList size={20} color={colors.purple} />
                    {editingSubtask ? 'Edit Subtask' : 'Add New Subtask'}
                  </>
                )}
                {workflowModal === 'checklist' && (
                  <>
                    <LuCircleCheckBig size={20} color={colors.success} />
                    {editingChecklist ? 'Edit Checklist Item' : 'Add Checklist Item'}
                  </>
                )}
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => {
                  setWorkflowModal(null);
                  setEditingTask(null);
                  setEditingSubtask(null);
                  setEditingChecklist(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)';
                }}
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {workflowModalData && workflowModal !== 'task' && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: isDark ? '#94a3b8' : '#64748b',
                }}>
                  {workflowModal === 'subtask' && (
                    <>Adding to task: <strong style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>{workflowModalData.taskName}</strong></>
                  )}
                  {workflowModal === 'checklist' && (
                    <>Adding to subtask: <strong style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>{workflowModalData.subtaskName}</strong></>
                  )}
                </div>
              )}

              {workflowError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '13px',
                }}>
                  {workflowError}
                </div>
              )}

              {/* Task Form */}
              {workflowModal === 'task' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Task Name *
                    </label>
                    <input
                      type="text"
                      value={workflowFormData.name || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Intake & Eligibility"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Phase Code *
                    </label>
                    <input
                      type="text"
                      value={workflowFormData.phase_code || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, phase_code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                      placeholder="e.g., INTAKE"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Description
                    </label>
                    <textarea
                      value={workflowFormData.description || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this task..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Color
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="color"
                        value={workflowFormData.color || '#0a4b94'}
                        onChange={(e) => setWorkflowFormData(prev => ({ ...prev, color: e.target.value }))}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      />
                      <input
                        type="text"
                        value={workflowFormData.color || '#0a4b94'}
                        onChange={(e) => setWorkflowFormData(prev => ({ ...prev, color: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Subtask Form */}
              {workflowModal === 'subtask' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Subtask Name *
                    </label>
                    <input
                      type="text"
                      value={workflowFormData.name || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Call Received"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Description
                    </label>
                    <textarea
                      value={workflowFormData.description || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Default Specialist
                    </label>
                    <select
                      value={workflowFormData.default_specialist_id || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, default_specialist_id: e.target.value ? parseInt(e.target.value) : null }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- No Default --</option>
                      {specialists.filter(s => s.is_active).map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.username})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#94a3b8' : '#64748b',
                        marginBottom: '6px',
                      }}>
                        Est. Duration (min)
                      </label>
                      <input
                        type="number"
                        value={workflowFormData.estimated_duration || 30}
                        onChange={(e) => setWorkflowFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 30 }))}
                        min={1}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#94a3b8' : '#64748b',
                        marginBottom: '6px',
                      }}>
                        SLA (hours)
                      </label>
                      <input
                        type="number"
                        value={workflowFormData.sla_hours !== null && workflowFormData.sla_hours !== undefined ? workflowFormData.sla_hours : ''}
                        onChange={(e) => {
                          const value = e.target.valueAsNumber;
                          setWorkflowFormData(prev => ({
                            ...prev,
                            sla_hours: isNaN(value) ? null : value
                          }));
                        }}
                        min={0.5}
                        step={0.5}
                        placeholder="e.g., 4 for 4 hours"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#94a3b8' : '#64748b',
                        marginBottom: '6px',
                      }}>
                        Required?
                      </label>
                      <select
                        value={workflowFormData.is_required !== false ? 'true' : 'false'}
                        onChange={(e) => setWorkflowFormData(prev => ({ ...prev, is_required: e.target.value === 'true' }))}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No (Optional)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Checklist Form */}
              {workflowModal === 'checklist' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={workflowFormData.name || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Verify caller identity"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}>
                      Description
                    </label>
                    <textarea
                      value={workflowFormData.description || ''}
                      onChange={(e) => setWorkflowFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Additional details..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#94a3b8' : '#64748b',
                        marginBottom: '6px',
                      }}>
                        Activity Category
                      </label>
                      <select
                        value={workflowFormData.activity_category || ''}
                        onChange={(e) => setWorkflowFormData(prev => ({ ...prev, activity_category: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      >
                        <option value="">-- Select Category --</option>
                        <option value="VERIFICATION">Verification</option>
                        <option value="DOCUMENTATION">Documentation</option>
                        <option value="REVIEW">Review</option>
                        <option value="APPROVAL">Approval</option>
                        <option value="COMMUNICATION">Communication</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="COMPLIANCE">Compliance</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#94a3b8' : '#64748b',
                        marginBottom: '6px',
                      }}>
                        Required?
                      </label>
                      <select
                        value={workflowFormData.is_required !== false ? 'true' : 'false'}
                        onChange={(e) => setWorkflowFormData(prev => ({ ...prev, is_required: e.target.value === 'true' }))}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No (Optional)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
            }}>
              <button
                onClick={() => {
                  setWorkflowModal(null);
                  setEditingTask(null);
                  setEditingSubtask(null);
                  setEditingChecklist(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSavingWorkflow(true);
                  setWorkflowError('');
                  try {
                    if (workflowModal === 'task') {
                      if (!workflowFormData.name || !workflowFormData.phase_code) {
                        setWorkflowError('Name and Phase Code are required');
                        setSavingWorkflow(false);
                        return;
                      }
                      if (editingTask) {
                        await updateWorkflowTask(editingTask.id, workflowFormData);
                      } else {
                        await createWorkflowTask(workflowFormData);
                      }
                    } else if (workflowModal === 'subtask') {
                      if (!workflowFormData.name) {
                        setWorkflowError('Subtask name is required');
                        setSavingWorkflow(false);
                        return;
                      }
                      if (editingSubtask) {
                        await updateSubtask(editingSubtask.id, workflowFormData);
                      } else {
                        await createSubtask(workflowModalData.taskId, workflowFormData);
                      }
                    } else if (workflowModal === 'checklist') {
                      if (!workflowFormData.name) {
                        setWorkflowError('Item name is required');
                        setSavingWorkflow(false);
                        return;
                      }
                      if (editingChecklist) {
                        await updateChecklistItem(editingChecklist.id, workflowFormData);
                      } else {
                        await createChecklistItem(workflowModalData.subtaskId, workflowFormData);
                      }
                    }
                    await fetchWorkflowTasks();
                    setWorkflowModal(null);
                    setEditingTask(null);
                    setEditingSubtask(null);
                    setEditingChecklist(null);
                    setToastMessage({ text: 'Saved successfully!', type: 'success' });
                  } catch (error) {
                    console.error('Failed to save:', error);
                    setWorkflowError(error.response?.data?.detail || 'Failed to save. Please try again.');
                  }
                  setSavingWorkflow(false);
                }}
                disabled={savingWorkflow}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0a4b94 0%, #117ACA 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: savingWorkflow ? 'not-allowed' : 'pointer',
                  opacity: savingWorkflow ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(10, 75, 148, 0.3)',
                }}
              >
                {savingWorkflow ? (
                  <>
                    <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <LuSave size={16} />
                    {editingTask || editingSubtask || editingChecklist ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '14px 20px',
            borderRadius: '12px',
            background: toastMessage.type === 'success'
              ? (isDark ? 'rgba(16, 185, 129, 0.95)' : '#10b981')
              : (isDark ? 'rgba(239, 68, 68, 0.95)' : '#ef4444'),
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
          }}
          onClick={() => setToastMessage(null)}
        >
          {toastMessage.type === 'success' ? <LuCircleCheck size={18} /> : <LuCircleX size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div style={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Confirm Delete</h3>
              <button
                onClick={handleDeleteCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#64748b' : '#94a3b8',
                  padding: '4px',
                }}
              >
                <LuX size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.deleteModalIcon}>
                <LuTrash2 size={28} color="#ef4444" />
              </div>
              <div style={styles.deleteModalText}>
                <p style={{ margin: '0 0 12px 0' }}>
                  Are you sure you want to delete this {deleteConfirmModal.type}?
                </p>
                <p style={{ margin: 0 }}>
                  <span style={styles.deleteModalItemName}>"{deleteConfirmModal.itemName}"</span>
                </p>
                {deleteConfirmModal.type === 'task' && (
                  <p style={{
                    margin: '16px 0 0 0',
                    fontSize: '13px',
                    color: isDark ? '#94a3b8' : '#64748b'
                  }}>
                    This will also delete all subtasks and checklist items under this task.
                  </p>
                )}
                {deleteConfirmModal.type === 'subtask' && (
                  <p style={{
                    margin: '16px 0 0 0',
                    fontSize: '13px',
                    color: isDark ? '#94a3b8' : '#64748b'
                  }}>
                    This will also delete all checklist items under this subtask.
                  </p>
                )}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button style={styles.deleteBtn} onClick={handleDeleteConfirm}>
                <LuTrash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          input:focus, select:focus {
            border-color: #117ACA !important;
            box-shadow: 0 0 0 3px rgba(17, 122, 202, 0.15) !important;
          }
          ::placeholder {
            color: ${isDark ? '#4a5568' : '#a0aec0'};
          }
        `}
      </style>
    </div>
  );
};

export default AdminDashboard;
