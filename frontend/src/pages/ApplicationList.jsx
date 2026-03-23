import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileText, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, ChevronUp, Activity, Home, Clock, CheckCircle, XCircle, AlertTriangle, Sun, Moon, Filter, X, Search, Layers, GitBranch, Plus, TrendingUp, Users, Zap, Ban, Trash2, Briefcase, Settings, LogOut } from 'lucide-react';
import { getApplications, getExecutions, getTransactions, getMockApiCalls, healthCheck, flushAllApplications, getApplicationNotes } from '../services/api';
import { format } from 'date-fns';
import WorkflowStageTracker from '../components/WorkflowStageTracker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Status configuration - single source of truth
const STATUS_CONFIG = {
  'IN_PROGRESS': { label: 'In Progress', icon: Activity, gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', glow: 'rgba(59, 130, 246, 0.4)', pulse: true },
  'COMPLETED': { label: 'Completed', icon: CheckCircle, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', glow: 'rgba(16, 185, 129, 0.4)', pulse: false },
  'DENIED': { label: 'Denied', icon: XCircle, gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', glow: 'rgba(239, 68, 68, 0.4)', pulse: false },
};

// All possible status values for filter dropdown
const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// All possible phase values for filter dropdown
const ALL_PHASES = [
  'INTAKE', 'APPLICATION', 'DISCLOSURE', 'LOAN_REVIEW',
  'UNDERWRITING', 'HUMAN_DECISION', 'COMMITMENT', 'CLOSING', 'POST_CLOSING', 'DENIAL'
];

function ApplicationList() {
  const { isDark, toggleTheme } = useTheme();
  const { isAdmin, isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedApp, setExpandedApp] = useState(null);
  const [appDetails, setAppDetails] = useState({});
  const [showFilters, setShowFilters] = useState(true);
  const [health, setHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'workflow'
  const [showFlushConfirm, setShowFlushConfirm] = useState(false);
  const [flushing, setFlushing] = useState(false);

  // Column filters
  const [filters, setFilters] = useState({
    application_id: '',
    status: '',
    phase: '',
    created_from: '',
    created_to: '',
  });

  const pageSize = 10;
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadApplications();
    loadHealth();
  }, [page]);

  // Auto-expand application if navigated from submission page
  useEffect(() => {
    if (location.state?.expandApplicationId && applications.length > 0) {
      const appId = location.state.expandApplicationId;
      setExpandedApp(appId);
      loadAppDetails(appId);
      // Clear the state to prevent re-expanding on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, applications]);

  const loadHealth = async () => {
    try {
      const healthData = await healthCheck();
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load health:', error);
    }
  };

  // Auto-refresh every 5 seconds when there are in-progress applications
  // But don't refresh when an app is expanded to prevent UI disruption
  useEffect(() => {
    if (!autoRefresh) return;
    if (expandedApp) return; // Don't auto-refresh when viewing details

    const hasInProgress = applications.some(app => app.status === 'IN_PROGRESS');
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      // Silent refresh - don't show loading state
      getApplications(1, 100, null).then(data => {
        setApplications(data.applications || []);
        setTotal(data.total || 0);
      }).catch(console.error);
    }, 3000); // Faster refresh for real-time updates

    return () => clearInterval(interval);
  }, [applications, autoRefresh, expandedApp]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      // Load all applications for client-side filtering (max 100 per backend limit)
      const data = await getApplications(1, 100, null);
      setApplications(data.applications || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for dropdown filters (use all possible + any from data)
  const uniqueStatuses = useMemo(() => {
    const dataStatuses = new Set(applications.map(app => app.status));
    const allStatuses = new Set([...ALL_STATUSES, ...dataStatuses]);
    return Array.from(allStatuses).sort();
  }, [applications]);

  const uniquePhases = useMemo(() => {
    const dataPhases = new Set(applications.map(app => app.current_phase).filter(Boolean));
    const allPhases = new Set([...ALL_PHASES, ...dataPhases]);
    return Array.from(allPhases).sort();
  }, [applications]);

  // Apply filters
  const filteredApplications = useMemo(() => {
    const result = applications.filter(app => {
      // Application ID filter
      if (filters.application_id && !app.application_id.toLowerCase().includes(filters.application_id.toLowerCase())) {
        return false;
      }

      // Status filter - simple exact match
      if (filters.status && app.status !== filters.status) {
        return false;
      }

      // Phase filter
      if (filters.phase && app.current_phase !== filters.phase) {
        return false;
      }

      // Created date range filter
      if (filters.created_from) {
        const appDate = new Date(app.created_at);
        const fromDate = new Date(filters.created_from);
        if (appDate < fromDate) return false;
      }

      if (filters.created_to) {
        const appDate = new Date(app.created_at);
        const toDate = new Date(filters.created_to);
        toDate.setHours(23, 59, 59, 999);
        if (appDate > toDate) return false;
      }

      return true;
    });
    return result;
  }, [applications, filters]);

  // Paginate filtered results
  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, page, pageSize]);

  // Calculate stats for summary cards (from ALL applications, not filtered)
  const stats = useMemo(() => {
    const total = applications.length;
    const inProgress = applications.filter(app => app.status === 'IN_PROGRESS').length;
    // Denied: check for DENIED status or denial nodes
    const denied = applications.filter(app =>
      app.status === 'DENIED' ||
      app.current_node === 'denial_node' ||
      app.current_node === 'end_denied'
    ).length;
    // Completed: COMPLETED status that isn't denied
    const completed = applications.filter(app =>
      app.status === 'COMPLETED' &&
      app.current_node !== 'denial_node' &&
      app.current_node !== 'end_denied'
    ).length;
    const pending = applications.filter(app => app.status === 'PENDING').length;
    const other = total - inProgress - completed - denied - pending;

    return { total, inProgress, completed, denied, pending, other };
  }, [applications]);

  // Get phase progress for mini indicator
  const getPhaseProgress = (phase) => {
    const phaseMapping = {
      'INTAKE': 1,
      'APPLICATION': 2,
      'DISCLOSURE': 2,
      'LOAN_REVIEW': 3,
      'REVIEW': 3,
      'UNDERWRITING': 4,
      'HUMAN_DECISION': 4,
      'DENIAL': 4,
      'COMMITMENT': 5,
      'CLOSING': 5,
      'POST_CLOSING': 5,
    };
    const progress = phaseMapping[phase] || 0;
    return (progress / 5) * 100;
  };

  // Update pagination when filters change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredApplications.length / pageSize));
    setPage(1);
  }, [filteredApplications.length, pageSize]);

  const loadAppDetails = async (appId) => {
    if (appDetails[appId]) return appDetails[appId];

    try {
      const [executions, transactions, apiCalls, specialistNotes] = await Promise.all([
        getExecutions(appId),
        getTransactions(appId),
        getMockApiCalls(appId),
        getApplicationNotes(appId).catch(() => []), // Don't fail if notes endpoint errors
      ]);

      const details = { executions, transactions, apiCalls, specialistNotes };
      setAppDetails(prev => ({ ...prev, [appId]: details }));
      return details;
    } catch (error) {
      console.error('Failed to load app details:', error);
      return null;
    }
  };

  const handleRowClick = async (app) => {
    const appId = app.application_id;

    if (expandedApp === appId) {
      setExpandedApp(null);
    } else {
      setExpandedApp(appId);
      await loadAppDetails(appId);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      application_id: '',
      status: '',
      phase: '',
      created_from: '',
      created_to: '',
    });
    setPage(1); // Reset to first page when clearing filters
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const handleFlushAllData = async () => {
    setFlushing(true);
    try {
      await flushAllApplications();
      setShowFlushConfirm(false);
      setApplications([]);
      setTotal(0);
      setExpandedApp(null);
      setAppDetails({});
      loadApplications();
    } catch (error) {
      console.error('Failed to flush data:', error);
      alert('Failed to flush data. Please try again.');
    } finally {
      setFlushing(false);
    }
  };

  // Simple status badge - uses status field directly from STATUS_CONFIG
  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || {
      label: status || 'Unknown',
      icon: Clock,
      gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      glow: 'rgba(100, 116, 139, 0.3)',
      pulse: false,
    };

    const Icon = config.icon;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: config.gradient,
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 600,
        boxShadow: `0 2px 8px ${config.glow}`,
        animation: config.pulse ? 'statusPulse 2s ease-in-out infinite' : 'none',
      }}>
        <Icon size={14} style={{ flexShrink: 0 }} />
        {config.label}
      </span>
    );
  };

  const details = expandedApp ? appDetails[expandedApp] : null;

  const inputClass = `w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    isDark
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;

  const selectClass = `w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
    isDark
      ? 'bg-gray-700 border-gray-600 text-white'
      : 'bg-white border-gray-300 text-gray-900'
  }`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1929' : '#F3F6FB'
    }}>
      {/* Header Bar - Redesigned with Clear Grouping */}
      <header
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #0B1929 0%, #112240 40%, #1A365D 100%)'
            : 'linear-gradient(135deg, #003B73 0%, #00508F 40%, #117ACA 100%)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Top Row - Branding & User Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Left: Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              <Layers size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
              }}>
                Loan Assumption Applications
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                <span style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.7)',
                }}>
                  Manage and track all loan assumptions
                </span>
              </div>
            </div>
          </div>

          {/* Right: Status & User Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Stats Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <Activity size={14} color="#93c5fd" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {filteredApplications.length}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>of</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {total}
              </span>
            </div>

            {/* Online Status */}
            {health && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#4ade80',
                  animation: 'pulse 2s infinite',
                  boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
                }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4ade80' }}>Online</span>
              </div>
            )}

            {/* Divider */}
            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)' }} />

            {/* User Section */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* User Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px 4px 4px',
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.1)',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isAdmin
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    color: '#fff',
                  }}>
                    {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>
                    {user?.full_name || user?.username}
                  </span>
                </div>

                {/* Workbench/Admin Button */}
                {!isAdmin ? (
                  <button
                    onClick={() => navigate('/workbench')}
                    title="Specialist Workbench"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.15) 100%)',
                      color: '#6ee7b7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Briefcase size={14} />
                    Workbench
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/admin')}
                    title="Admin Dashboard"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.15) 100%)',
                      color: '#c4b5fd',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Settings size={14} />
                    Admin
                  </button>
                )}

                {/* Logout */}
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  title={`Logout (${user?.full_name || user?.username})`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                title="Login"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  color: '#93c5fd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                <Briefcase size={14} />
                Login
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Bottom Row - Navigation & Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
        }}>
          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px',
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <button
              onClick={() => {
                setExpandedApp(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <FileText size={15} />
              Applications
            </button>
            <Link
              to="/?view=agentic"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Layers size={15} />
              Agentic Workflow
            </Link>
            <Link
              to="/?view=flowchart"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <GitBranch size={15} />
              Workflow
            </Link>
            <Link
              to="/new"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Plus size={15} />
              Simulate
            </Link>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: showFilters
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 100%)'
                  : 'rgba(255,255,255,0.1)',
                color: showFilters ? '#93c5fd' : '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Filter size={15} />
              Filters
              {hasActiveFilters && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#fbbf24',
                  boxShadow: '0 0 6px rgba(251, 191, 36, 0.6)',
                }} />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <X size={14} />
                Clear
              </button>
            )}

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            {/* Refresh */}
            <button
              onClick={loadApplications}
              title="Refresh applications"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {/* Flush All */}
            <button
              onClick={() => setShowFlushConfirm(true)}
              title="Delete all application data"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              <Trash2 size={14} />
              Flush All
            </button>
          </div>
        </div>
      </header>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes statusPulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 2px 16px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Summary Stats Cards */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            marginBottom: '20px',
          }}>
            {/* Total Applications */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}>
                <Users size={24} color="#fff" />
              </div>
              <div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: isDark ? '#fff' : '#1e293b',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}>{stats.total}</div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#64748b',
                  marginTop: '4px',
                }}>Total Applications</div>
              </div>
            </div>

            {/* In Progress */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              }}>
                <Zap size={24} color="#fff" />
              </div>
              <div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: isDark ? '#fff' : '#1e293b',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}>{stats.inProgress}</div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#64748b',
                  marginTop: '4px',
                }}>In Progress</div>
              </div>
              {stats.inProgress > 0 && (
                <div style={{
                  marginLeft: 'auto',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  animation: 'pulse 2s infinite',
                  boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
                }} />
              )}
            </div>

            {/* Completed */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}>
                <CheckCircle size={24} color="#fff" />
              </div>
              <div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: isDark ? '#fff' : '#1e293b',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}>{stats.completed}</div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#64748b',
                  marginTop: '4px',
                }}>Loan Closed</div>
              </div>
            </div>

            {/* Denied */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
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
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}>
                <Ban size={24} color="#fff" />
              </div>
              <div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: isDark ? '#fff' : '#1e293b',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}>{stats.denied}</div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#64748b',
                  marginTop: '4px',
                }}>Denied</div>
              </div>
            </div>

            {/* Success Rate */}
            <div style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(17, 122, 202, 0.15) 0%, rgba(17, 122, 202, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(0, 59, 115, 0.1) 0%, rgba(0, 59, 115, 0.02) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${isDark ? 'rgba(17, 122, 202, 0.3)' : 'rgba(0, 80, 143, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #117ACA 0%, #00508F 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 59, 115, 0.3)',
              }}>
                <TrendingUp size={24} color="#fff" />
              </div>
              <div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: isDark ? '#fff' : '#1e293b',
                  lineHeight: 1,
                  fontFamily: 'monospace',
                }}>{stats.completed + stats.denied > 0 ? Math.round((stats.completed / (stats.completed + stats.denied)) * 100) : 0}%</div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#64748b',
                  marginTop: '4px',
                }}>Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div style={{ flex: 1, padding: '0 20px 20px' }}>
          <div style={{
            border: `1px solid ${isDark ? '#1E3A5F' : '#D8E3F0'}`,
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: isDark ? '#112240' : '#FFFFFF',
            boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 59, 115, 0.08)'
          }}>
            {/* Table Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isDark ? '#1E3A5F' : '#E2E8F0'}`,
              background: isDark ? 'rgba(30, 58, 95, 0.3)' : 'rgba(248, 250, 252, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={20} color={isDark ? '#60a5fa' : '#3b82f6'} />
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: isDark ? '#fff' : '#1e293b',
                }}>Application Queue</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                  color: isDark ? '#60a5fa' : '#3b82f6',
                }}>{filteredApplications.length} items</span>
              </div>
            </div>

            <table className="w-full">
              <thead>
                {/* Column Headers */}
                <tr style={{
                  background: isDark ? 'rgba(30, 58, 95, 0.2)' : '#f8fafc',
                }}>
                  <th style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}>
                    <div className="flex items-center gap-1">
                      Application ID
                      {filters.application_id && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                    </div>
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}>
                    <div className="flex items-center gap-1">
                      Status
                      {filters.status && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                    </div>
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}>
                    <div className="flex items-center gap-1">
                      Phase Progress
                      {filters.phase && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                    </div>
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    textAlign: 'left',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}>
                    <div className="flex items-center gap-1">
                      Created
                      {(filters.created_from || filters.created_to) && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                    </div>
                  </th>
                  <th style={{
                    padding: '14px 20px',
                    width: '60px',
                  }}></th>
                </tr>

                  {/* Filter Row */}
                  {showFilters && (
                    <tr className={isDark ? 'bg-gray-700/30' : 'bg-gray-50'}>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <input
                            type="text"
                            placeholder="Search ID..."
                            value={filters.application_id}
                            onChange={(e) => updateFilter('application_id', e.target.value)}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={filters.status}
                          onChange={(e) => updateFilter('status', e.target.value)}
                          className={selectClass}
                        >
                          <option value="">All Status</option>
                          {uniqueStatuses.map(status => (
                            <option key={status} value={status}>
                              {STATUS_CONFIG[status]?.label || status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={filters.phase}
                          onChange={(e) => updateFilter('phase', e.target.value)}
                          className={selectClass}
                        >
                          <option value="">All Phases</option>
                          {uniquePhases.map(phase => (
                            <option key={phase} value={phase}>{phase}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <input
                            type="date"
                            value={filters.created_from}
                            onChange={(e) => updateFilter('created_from', e.target.value)}
                            className={`${inputClass} flex-1`}
                            title="From date"
                          />
                          <input
                            type="date"
                            value={filters.created_to}
                            onChange={(e) => updateFilter('created_to', e.target.value)}
                            className={`${inputClass} flex-1`}
                            title="To date"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                          Loading applications...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedApplications.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        {hasActiveFilters ? 'No applications match your filters' : 'No applications found'}
                        {hasActiveFilters && (
                          <button
                            onClick={clearFilters}
                            className="block mx-auto mt-2 text-blue-500 hover:text-blue-600 text-sm"
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedApplications
                      .filter(app => !expandedApp || app.application_id === expandedApp)
                      .map((app) => (
                      <React.Fragment key={app.application_id}>
                        <tr
                          onClick={() => handleRowClick(app)}
                          className={`border-t cursor-pointer transition-all duration-300 ${
                            isDark ? 'border-gray-700' : 'border-gray-200'
                          } ${
                            expandedApp === app.application_id
                              ? isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                              : isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm" style={{ color: isDark ? '#ffffff' : '#3b82f6' }}>{app.application_id}</span>
                              {expandedApp === app.application_id && (
                                <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                  Viewing Details
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(app.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(() => {
                                // Map backend phases to visual phase indices (0-4)
                                const BACKEND_TO_VISUAL = {
                                  'INTAKE': 0,
                                  'APPLICATION': 1,
                                  'DISCLOSURE': 1,
                                  'LOAN_REVIEW': 2,
                                  'UNDERWRITING': 3,
                                  'HUMAN_DECISION': 3,
                                  'DENIAL': 3, // Denial happens during underwriting decision
                                  'COMMITMENT': 4,
                                  'CLOSING': 4,
                                  'POST_CLOSING': 5, // Beyond the 5 visual bars = all complete
                                };
                                const visualPhases = ['INTAKE', 'APPLICATION', 'REVIEW', 'UNDERWRITING', 'CLOSING'];
                                const currentVisualIdx = BACKEND_TO_VISUAL[app.current_phase] ?? -1;
                                const isDenied = app.status === 'DENIED' || app.current_node === 'denial_node' || app.current_node === 'end_denied' || app.current_phase === 'DENIAL';
                                // Check if truly completed: status COMPLETED AND at terminal state
                                const isAtTerminalState = app.current_phase === 'POST_CLOSING' ||
                                                          app.current_node === 'end_loan_closed' ||
                                                          app.current_node === 'end';
                                const isCompleted = app.status === 'COMPLETED' && isAtTerminalState;

                                // Always show actual current_phase value
                                return (
                                  <>
                                    <span style={{
                                      fontSize: '0.8125rem',
                                      fontWeight: 600,
                                      color: isCompleted ? '#10b981' : isDenied ? '#ef4444' : isDark ? '#e2e8f0' : '#334155',
                                    }}>{app.current_phase || 'N/A'}</span>
                                    {/* Mini Phase Progress Bar */}
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      height: '6px',
                                    }}>
                                      {visualPhases.map((phase, idx) => {
                                        const isPastPhase = idx < currentVisualIdx;
                                        const isCurrentPhase = idx === currentVisualIdx;

                                        let bgColor;
                                        if (isDenied && idx <= currentVisualIdx) {
                                          bgColor = '#ef4444'; // Red for denied path
                                        } else if (isCompleted || isPastPhase) {
                                          bgColor = '#10b981'; // Green for completed
                                        } else if (isCurrentPhase) {
                                          bgColor = '#f59e0b'; // Amber for current
                                        } else {
                                          bgColor = isDark ? '#334155' : '#e2e8f0'; // Gray for pending
                                        }

                                        return (
                                          <div
                                            key={phase}
                                            style={{
                                              flex: 1,
                                              height: '100%',
                                              borderRadius: '3px',
                                              background: bgColor,
                                              transition: 'background 0.3s ease',
                                            }}
                                            title={phase}
                                          />
                                        );
                                      })}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {format(new Date(app.created_at), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className={isDark ? 'px-4 py-3 text-gray-400' : 'px-4 py-3 text-gray-600'}>
                            {expandedApp === app.application_id ? (
                              <div className="flex items-center gap-1 text-blue-500">
                                <span className="text-xs font-medium">Collapse</span>
                                <ChevronUp className="w-4 h-4" />
                              </div>
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded Details - Stage Tracker View */}
                        {expandedApp === app.application_id && details && (
                          <tr>
                            <td colSpan="5" className={`p-0 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                              <WorkflowStageTracker
                                application={app}
                                executions={details.executions}
                                apiCalls={details.apiCalls}
                                transactions={details.transactions || []}
                                specialistNotes={details.specialistNotes || []}
                                isDark={isDark}
                                onApplicationUpdate={(updatedApp) => {
                                  // Update the applications list to sync table row display
                                  setApplications(prev => prev.map(a =>
                                    a.application_id === updatedApp.application_id ? updatedApp : a
                                  ));
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredApplications.length)} of {filteredApplications.length}
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`p-1.5 rounded border disabled:opacity-50 transition-colors ${
                        isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-white' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className={`px-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className={`p-1.5 rounded border disabled:opacity-50 transition-colors ${
                        isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-white' : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Flush Confirmation Modal */}
      {showFlushConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trash2 size={24} color="#EF4444" />
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: isDark ? '#F1F5F9' : '#1E293B',
                }}>Flush All Data</h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: isDark ? '#94A3B8' : '#64748B',
                }}>This action cannot be undone</p>
              </div>
            </div>

            <p style={{
              margin: '0 0 24px',
              fontSize: '0.9375rem',
              color: isDark ? '#CBD5E1' : '#475569',
              lineHeight: 1.6,
            }}>
              Are you sure you want to delete <strong>all {total} loan applications</strong> and their associated data? This will permanently remove:
            </p>

            <ul style={{
              margin: '0 0 24px',
              padding: '0 0 0 20px',
              fontSize: '0.875rem',
              color: isDark ? '#94A3B8' : '#64748B',
              lineHeight: 1.8,
            }}>
              <li>All loan applications</li>
              <li>Workflow states</li>
              <li>Agent executions</li>
              <li>Transaction logs</li>
              <li>Human tasks</li>
              <li>API call records</li>
            </ul>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowFlushConfirm(false)}
                disabled={flushing}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                  backgroundColor: 'transparent',
                  color: isDark ? '#E2E8F0' : '#475569',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: flushing ? 'not-allowed' : 'pointer',
                  opacity: flushing ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleFlushAllData}
                disabled={flushing}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: flushing ? 'not-allowed' : 'pointer',
                  opacity: flushing ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {flushing ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete All Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationList;
