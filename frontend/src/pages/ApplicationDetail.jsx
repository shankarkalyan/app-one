import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LuArrowLeft,
  LuRefreshCw,
  LuActivity,
  LuFileText,
  LuClock,
  LuCircleCheck,
  LuCircleX,
  LuTriangleAlert,
  LuPlay,
  LuUser,
  LuServer,
  LuChevronDown,
  LuChevronRight,
  LuEye,
  LuCpu,
  LuZap,
} from 'react-icons/lu';
import { format } from 'date-fns';
import {
  getApplication,
  getWorkflowGraph,
  getAgentExecutions,
  getTransactionLogs,
  getHumanTasks,
  getMockApiCalls,
  completeHumanTask,
  manualUpdateTaskStatus,
  manualUpdatePhase,
  getAvailablePhases,
  completeCurrentTask,
  simulateDocumentReturn,
} from '../services/api';
import WorkflowGraph from '../components/WorkflowGraph';
import JsonViewerModal from '../components/JsonViewerModal';
import { useTheme } from '../context/ThemeContext';

// Process phases configuration
const PROCESS_PHASES = [
  { id: 1, name: 'Intake', key: 'Intake' },
  { id: 2, name: 'Application', key: 'Application' },
  { id: 3, name: 'Disclosure', key: 'Disclosure' },
  { id: 4, name: 'Loan Review', key: 'LoanReview' },
  { id: 5, name: 'Underwriting', key: 'Underwriting' },
  { id: 6, name: 'Commitment', key: 'Commitment' },
  { id: 7, name: 'Closing', key: 'Closing' },
  { id: 8, name: 'Servicing', key: 'Servicing' },
];

function ApplicationDetail() {
  const { id } = useParams();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [humanTasks, setHumanTasks] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);
  const [activeTab, setActiveTab] = useState('phases');
  const [error, setError] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [jsonModal, setJsonModal] = useState({ isOpen: false, title: '', request: null, response: null });
  const [availablePhases, setAvailablePhases] = useState(null);
  const [showPhaseControl, setShowPhaseControl] = useState(false);

  const theme = {
    bgBody: isDark ? '#0B1929' : '#F3F6FB',
    bgCard: isDark ? '#112240' : '#FFFFFF',
    bgCardAlt: isDark ? '#0B1929' : '#F8FBFF',
    textPrimary: isDark ? '#CDD9E5' : '#0D2137',
    textSecondary: isDark ? '#8EA4BD' : '#4A6380',
    textMuted: isDark ? '#5A7A9A' : '#7E95AB',
    borderCard: isDark ? '#1E3A5F' : '#D8E3F0',
    brand: '#117ACA',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    pending: isDark ? '#5A7A9A' : '#9CA3AF',
  };

  const togglePhaseExpanded = (phaseId) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const openJsonModal = (title, requestData, responseData) => {
    setJsonModal({ isOpen: true, title, request: requestData, response: responseData });
  };

  const closeJsonModal = () => {
    setJsonModal({ isOpen: false, title: '', request: null, response: null });
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appData, graphData, execData, transData, tasksData, callsData, phasesData] = await Promise.all([
        getApplication(id),
        getWorkflowGraph(id),
        getAgentExecutions(id),
        getTransactionLogs(id),
        getHumanTasks(id),
        getMockApiCalls(id),
        getAvailablePhases(id),
      ]);

      setApplication(appData);
      setGraphData(graphData);
      setExecutions(execData);
      setTransactions(transData);
      setHumanTasks(tasksData);
      setApiCalls(callsData);
      setAvailablePhases(phasesData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId, decision) => {
    try {
      await completeHumanTask(id, taskId, {
        decision,
        decided_by: 'UI User',
        notes: 'Decision made via UI',
      });
      loadAllData();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleManualStatusUpdate = async (taskId, newStatus) => {
    try {
      await manualUpdateTaskStatus(id, taskId, {
        new_status: newStatus,
        updated_by: 'UI User',
        reason: 'Manual status update by user',
      });
      loadAllData();
    } catch (err) {
      console.error('Failed to manually update task:', err);
    }
  };

  const handleManualPhaseUpdate = async (targetPhase, targetNode = null) => {
    try {
      await manualUpdatePhase(id, {
        target_phase: targetPhase,
        target_node: targetNode,
        updated_by: 'UI User',
        reason: 'Manual phase update by user',
      });
      setShowPhaseControl(false);
      loadAllData();
    } catch (err) {
      console.error('Failed to manually update phase:', err);
    }
  };

  const handleSimulateDocReturn = async () => {
    try {
      await simulateDocumentReturn(id);
      loadAllData();
    } catch (err) {
      console.error('Failed to simulate document return:', err);
    }
  };

  const handleCompleteCurrentTask = async () => {
    try {
      await completeCurrentTask(id, 'UI User');
      loadAllData();
    } catch (err) {
      console.error('Failed to complete current task:', err);
    }
  };

  // Get phase status based on executions and current phase
  const getPhaseStatus = (phaseKey) => {
    const phaseExecutions = executions.filter(e => e.phase === phaseKey);
    if (phaseExecutions.length === 0) {
      // Check if this phase is before or after current phase
      const currentPhaseIndex = PROCESS_PHASES.findIndex(p => p.key === application?.current_phase);
      const thisPhaseIndex = PROCESS_PHASES.findIndex(p => p.key === phaseKey);
      if (thisPhaseIndex < currentPhaseIndex) return 'completed';
      if (thisPhaseIndex === currentPhaseIndex) return 'active';
      return 'pending';
    }
    const hasRunning = phaseExecutions.some(e => e.status === 'RUNNING');
    const hasFailed = phaseExecutions.some(e => e.status === 'FAILED');
    const allCompleted = phaseExecutions.every(e => e.status === 'COMPLETED');
    if (hasRunning) return 'active';
    if (hasFailed) return 'failed';
    if (allCompleted) return 'completed';
    return 'pending';
  };

  // Get agents for a specific phase
  const getPhaseAgents = (phaseKey) => {
    return executions.filter(e => e.phase === phaseKey);
  };

  // Get API calls for a specific agent execution
  const getAgentApiCalls = (agentName) => {
    return apiCalls.filter(c => c.agent_name === agentName || c.calling_agent === agentName);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: theme.bgBody
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid transparent',
            borderTopColor: theme.brand,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: theme.textSecondary }}>Loading Application...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bgBody,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECACA'}`,
          borderRadius: '14px',
          padding: '32px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <LuTriangleAlert size={48} color={theme.error} style={{ marginBottom: '16px' }} />
          <p style={{ color: theme.error, marginBottom: '16px' }}>{error}</p>
          <Link to="/applications" style={{ color: theme.brand, textDecoration: 'none' }}>
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bgBody,
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '24px'
      }}>
        <Link
          to="/applications"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: theme.textSecondary,
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          <LuArrowLeft size={18} />
          Back to Applications
        </Link>

        {/* View-only info banner */}
        {application && application.status !== 'COMPLETED' && (
          <div style={{
            backgroundColor: isDark ? 'rgba(17, 122, 202, 0.15)' : 'rgba(17, 122, 202, 0.1)',
            border: '1px solid rgba(17, 122, 202, 0.3)',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <LuActivity size={20} color="#117ACA" />
            <div style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                Current Phase: {application?.current_phase?.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Task completion is managed through the Specialist Workbench
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 8px',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: theme.textPrimary
            }}>
              Application {id}
            </h1>
            <p style={{ margin: 0, color: theme.textSecondary, fontSize: '14px' }}>
              Phase: {application?.current_phase} | Node: {application?.current_node} |
              Simulation: {application?.is_in_progress_simulation ? 'Yes' : 'No'} |
              Status: {application?.status}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusBadge status={application?.status} endState={application?.end_state} theme={theme} isDark={isDark} />
            <button
              onClick={loadAllData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${theme.borderCard}`,
                backgroundColor: theme.bgCard,
                color: theme.textPrimary,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <LuRefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <SummaryCard
          icon={Activity}
          label="Eligibility"
          value={application?.eligibility_status || 'Pending'}
          theme={theme}
          color={application?.eligibility_status?.includes('Not Applicable') ? theme.textMuted : theme.brand}
          isManualUpdate={application?.eligibility_status?.includes('Not Applicable')}
        />
        <SummaryCard
          icon={FileText}
          label="App Status"
          value={application?.app_status || 'Pending'}
          theme={theme}
          color={application?.app_status?.includes('Not Applicable') ? theme.textMuted : theme.warning}
          isManualUpdate={application?.app_status?.includes('Not Applicable')}
        />
        <SummaryCard
          icon={Clock}
          label="SLA Days"
          value={application?.sla_days || 0}
          theme={theme}
          color="#F97316"
        />
        <SummaryCard
          icon={CheckCircle}
          label="UW Decision"
          value={application?.uw_decision || 'Pending'}
          theme={theme}
          color={application?.uw_decision?.includes('Not Applicable') ? theme.textMuted : theme.success}
          isManualUpdate={application?.uw_decision?.includes('Not Applicable')}
        />
      </div>

      {/* In-Progress Simulation Banner - Show when simulation is in progress OR status is IN_PROGRESS with in_progress_task */}
      {(application?.is_in_progress_simulation || (application?.status === 'IN_PROGRESS' && application?.in_progress_task)) && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 24px',
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#DCFCE7',
          border: `2px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC'}`,
          borderRadius: '14px',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <LuPlay size={24} color={theme.success} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: theme.textPrimary }}>
                    Step-by-Step Simulation Mode
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    backgroundColor: theme.warning,
                    color: '#fff',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Task In Progress - No Data
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: theme.textSecondary }}>
                  <strong>Current Task:</strong> {application?.in_progress_task || application?.current_phase?.replace('_', ' ')}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: theme.textMuted }}>
                  The <strong>{application?.current_phase?.replace('_', ' ')}</strong> task has no data yet.
                  Click <strong>"Complete Task"</strong> to populate data and move to next step.
                </p>
              </div>
            </div>
            <button
              onClick={handleCompleteCurrentTask}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: theme.success,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
              }}
            >
              <LuCircleCheck size={18} />
              Complete Task
            </button>
          </div>
          {/* Progress indicator */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.2)' : '#BBF7D0'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {['INTAKE', 'APPLICATION', 'DISCLOSURE', 'LOAN_REVIEW', 'UNDERWRITING', 'COMMITMENT', 'CLOSING', 'POST_CLOSING'].map((phase, idx) => {
                const currentIdx = ['INTAKE', 'APPLICATION', 'DISCLOSURE', 'LOAN_REVIEW', 'UNDERWRITING', 'COMMITMENT', 'CLOSING', 'POST_CLOSING'].indexOf(application?.current_phase);
                const isCompleted = idx < currentIdx;
                const isCurrent = phase === application?.current_phase;
                const isNext = phase === application?.next_phase;
                return (
                  <React.Fragment key={phase}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      backgroundColor: isCompleted
                        ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#BBF7D0')
                        : isCurrent
                          ? theme.brand
                          : isNext
                            ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7')
                            : (isDark ? 'rgba(90, 122, 154, 0.2)' : '#F3F4F6'),
                      color: isCompleted
                        ? theme.success
                        : isCurrent
                          ? '#fff'
                          : isNext
                            ? theme.warning
                            : theme.textMuted,
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      {isCompleted && <LuCircleCheck size={12} />}
                      {isCurrent && <LuPlay size={12} />}
                      {phase.replace('_', ' ')}
                    </div>
                    {idx < 7 && (
                      <div style={{
                        width: '16px',
                        height: '2px',
                        backgroundColor: isCompleted ? theme.success : (isDark ? 'rgba(90, 122, 154, 0.3)' : '#E5E7EB'),
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Manual Update Indicator */}
      {application?.is_manual_update && !application?.is_in_progress_simulation && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 24px',
          backgroundColor: isDark ? 'rgba(120, 113, 108, 0.1)' : '#F5F5F4',
          border: `1px solid ${isDark ? 'rgba(120, 113, 108, 0.2)' : '#D6D3D1'}`,
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <LuTriangleAlert size={18} color={theme.warning} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: theme.textPrimary, fontSize: '13px' }}>
              Manual Update Applied
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textSecondary }}>
              Updated by: {application?.manual_update_by || 'Unknown'} —
              Automated fields show "Not Applicable : Manually Updated By User" because no automated process ran.
            </p>
          </div>
        </div>
      )}

      {/* Manual Phase Control Panel */}
      {application?.status === 'IN_PROGRESS' && availablePhases && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 24px',
          backgroundColor: isDark ? 'rgba(17, 122, 202, 0.1)' : '#EBF5FF',
          border: `1px solid ${isDark ? 'rgba(17, 122, 202, 0.2)' : '#BFDBFE'}`,
          borderRadius: '14px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LuZap size={20} color={theme.brand} />
              <span style={{ fontWeight: 600, color: theme.textPrimary }}>Manual Phase Control</span>
              <span style={{
                fontSize: '11px',
                padding: '3px 8px',
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                color: theme.warning,
                borderRadius: '12px',
                fontWeight: 600
              }}>
                Current: {application?.current_phase}
              </span>
            </div>
            <button
              onClick={() => setShowPhaseControl(!showPhaseControl)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${theme.brand}`,
                backgroundColor: showPhaseControl ? theme.brand : 'transparent',
                color: showPhaseControl ? '#fff' : theme.brand,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showPhaseControl ? 'Hide Controls' : 'Show Phase Controls'}
              {showPhaseControl ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
            </button>
          </div>

          {showPhaseControl && (
            <div style={{
              backgroundColor: theme.bgCard,
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${theme.borderCard}`
            }}>
              <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 16px' }}>
                Click on any phase below to manually move the application to that step.
                <span style={{ fontStyle: 'italic', color: theme.warning }}> Automated fields will be set to "Not Applicable : Manually Updated By User"</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availablePhases.phases.map((phase, index) => {
                  const isCurrentPhase = phase.is_current;
                  const isNextPhase = phase.is_next;
                  return (
                    <div
                      key={phase.phase}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: isCurrentPhase
                          ? (isDark ? 'rgba(17, 122, 202, 0.15)' : '#DBEAFE')
                          : theme.bgCardAlt,
                        borderRadius: '8px',
                        border: `1px solid ${isCurrentPhase ? theme.brand : theme.borderCard}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isCurrentPhase ? theme.brand : (isNextPhase ? theme.success : theme.pending),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          {index + 1}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: theme.textPrimary, fontSize: '14px' }}>
                            {phase.phase.replace('_', ' ')}
                            {isCurrentPhase && <span style={{ marginLeft: '8px', fontSize: '11px', color: theme.brand }}>(Current)</span>}
                            {isNextPhase && <span style={{ marginLeft: '8px', fontSize: '11px', color: theme.success }}>(Next)</span>}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: theme.textMuted }}>
                            Nodes: {phase.nodes.join(', ')}
                          </p>
                        </div>
                      </div>
                      {!isCurrentPhase && (
                        <button
                          onClick={() => handleManualPhaseUpdate(phase.phase)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isNextPhase ? theme.success : theme.brand,
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isNextPhase ? 'Move to Next' : 'Move Here'}
                        </button>
                      )}
                      {isCurrentPhase && (
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(17, 122, 202, 0.2)' : '#BFDBFE',
                          color: theme.brand,
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Human Tasks */}
      {humanTasks.filter((t) => t.status === 'PENDING').length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 24px',
          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : '#F3E8FF',
          border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.2)' : '#DDD6FE'}`,
          borderRadius: '14px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LuUser size={20} color="#8B5CF6" />
            <span style={{ fontWeight: 600, color: theme.textPrimary }}>Human Action Required</span>
          </div>
          {humanTasks.filter((t) => t.status === 'PENDING').map((task) => (
            <div key={task.id} style={{
              backgroundColor: theme.bgCard,
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '12px',
              border: `1px solid ${theme.borderCard}`
            }}>
              <p style={{ fontWeight: 600, color: theme.textPrimary, margin: '0 0 8px' }}>{task.task_type}</p>
              <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 16px' }}>{task.task_description}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => handleCompleteTask(task.id, 'yes')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: theme.success, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Approve</button>
                <button onClick={() => handleCompleteTask(task.id, 'no')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: theme.error, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Deny</button>
                <div style={{ borderLeft: `1px solid ${theme.borderCard}`, margin: '0 4px' }} />
                <button onClick={() => handleManualStatusUpdate(task.id, 'in_progress')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.warning}`,
                  backgroundColor: 'transparent', color: theme.warning, fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Manual: In Progress</button>
                <button onClick={() => handleManualStatusUpdate(task.id, 'completed')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.brand}`,
                  backgroundColor: 'transparent', color: theme.brand, fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Manual: Complete</button>
              </div>
              <p style={{ fontSize: '11px', color: theme.textMuted, margin: '12px 0 0', fontStyle: 'italic' }}>
                Manual updates will set automated fields to "Not Applicable : Manually Updated By User"
              </p>
            </div>
          ))}
        </div>
      )}

      {/* In-Progress Human Tasks */}
      {humanTasks.filter((t) => t.status === 'IN_PROGRESS').length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 24px',
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
          border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.2)' : '#FCD34D'}`,
          borderRadius: '14px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LuActivity size={20} color="#F59E0B" />
            <span style={{ fontWeight: 600, color: theme.textPrimary }}>Tasks In Progress</span>
          </div>
          {humanTasks.filter((t) => t.status === 'IN_PROGRESS').map((task) => (
            <div key={task.id} style={{
              backgroundColor: theme.bgCard,
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '12px',
              border: `1px solid ${theme.borderCard}`
            }}>
              <p style={{ fontWeight: 600, color: theme.textPrimary, margin: '0 0 8px' }}>{task.task_type}</p>
              <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 8px' }}>{task.task_description}</p>
              {task.is_manual_update && (
                <p style={{ fontSize: '12px', color: theme.warning, margin: '0 0 8px' }}>
                  Manually updated by: {task.manual_update_by}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={() => handleCompleteTask(task.id, 'yes')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: theme.success, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Approve</button>
                <button onClick={() => handleCompleteTask(task.id, 'no')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: theme.error, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Deny</button>
                <div style={{ borderLeft: `1px solid ${theme.borderCard}`, margin: '0 4px' }} />
                <button onClick={() => handleManualStatusUpdate(task.id, 'completed')} style={{
                  padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.brand}`,
                  backgroundColor: 'transparent', color: theme.brand, fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>Manual: Complete</button>
              </div>
              <p style={{ fontSize: '11px', color: theme.textMuted, margin: '12px 0 0', fontStyle: 'italic' }}>
                Manual updates will set automated fields to "Not Applicable : Manually Updated By User"
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 24px',
        borderBottom: `1px solid ${theme.borderCard}`,
        display: 'flex',
        gap: '8px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'phases', label: 'Phase Status', icon: Zap },
          { id: 'workflow', label: 'Workflow Graph', icon: Activity },
          { id: 'executions', label: 'Agent Executions', icon: Play },
          { id: 'transactions', label: 'Transaction Log', icon: FileText },
          { id: 'api-calls', label: 'API Calls', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                border: 'none',
                borderBottom: `3px solid ${activeTab === tab.id ? theme.brand : 'transparent'}`,
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? theme.textPrimary : theme.textMuted,
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'phases' && (
          <PhaseStatusView
            phases={PROCESS_PHASES}
            getPhaseStatus={getPhaseStatus}
            getPhaseAgents={getPhaseAgents}
            getAgentApiCalls={getAgentApiCalls}
            expandedPhases={expandedPhases}
            togglePhaseExpanded={togglePhaseExpanded}
            openJsonModal={openJsonModal}
            theme={theme}
            isDark={isDark}
            currentPhase={application?.current_phase}
            handleManualPhaseUpdate={handleManualPhaseUpdate}
            handleCompleteCurrentTask={handleCompleteCurrentTask}
            isInProgress={application?.status === 'IN_PROGRESS'}
            isInProgressSimulation={application?.is_in_progress_simulation}
            nextPhase={application?.next_phase}
            availablePhases={availablePhases}
          />
        )}

        {activeTab === 'workflow' && (
          <div style={{
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.borderCard}`,
            borderRadius: '14px',
            padding: '24px'
          }}>
            <WorkflowGraph data={graphData} currentNode={application?.current_node} />
          </div>
        )}

        {activeTab === 'executions' && (
          <div style={{
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.borderCard}`,
            borderRadius: '14px',
            padding: '24px'
          }}>
            <ExecutionsList executions={executions} theme={theme} isDark={isDark} />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={{
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.borderCard}`,
            borderRadius: '14px',
            padding: '24px'
          }}>
            <TransactionsList transactions={transactions} theme={theme} isDark={isDark} />
          </div>
        )}

        {activeTab === 'api-calls' && (
          <div style={{
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.borderCard}`,
            borderRadius: '14px',
            padding: '24px'
          }}>
            <ApiCallsList calls={apiCalls} openJsonModal={openJsonModal} theme={theme} isDark={isDark} />
          </div>
        )}
      </div>

      {/* Removed: Fixed Bottom Action Bar - Task completion now handled in Specialist Workbench */}

      {/* JSON Viewer Modal */}
      <JsonViewerModal
        isOpen={jsonModal.isOpen}
        onClose={closeJsonModal}
        title={jsonModal.title}
        requestData={jsonModal.request}
        responseData={jsonModal.response}
        isDark={isDark}
      />
    </div>
  );
}

function StatusBadge({ status, endState, theme, isDark }) {
  let bg = theme.pending;
  let text = status;

  if (status === 'COMPLETED' && endState) {
    const endColors = {
      LOAN_CLOSED: '#22C55E',
      INELIGIBLE: '#EF4444',
      INCOMPLETE: '#F59E0B',
      WITHDRAWN: '#F97316',
      DENIED: '#EF4444',
    };
    bg = endColors[endState] || theme.pending;
    text = endState.replace('_', ' ');
  } else if (status === 'IN_PROGRESS') {
    bg = theme.brand;
  } else if (status === 'FAILED') {
    bg = theme.error;
  }

  return (
    <span style={{
      backgroundColor: bg,
      color: '#fff',
      fontSize: '12px',
      fontWeight: 600,
      padding: '6px 14px',
      borderRadius: '20px'
    }}>
      {text}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, theme, color, isManualUpdate = false }) {
  // Shorten the manual update placeholder for display
  const displayValue = isManualUpdate ? 'N/A (Manual)' : value;

  return (
    <div style={{
      backgroundColor: theme.bgCard,
      border: `1px solid ${theme.borderCard}`,
      borderRadius: '12px',
      padding: '16px',
      position: 'relative'
    }}>
      {isManualUpdate && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '9px',
          padding: '2px 6px',
          backgroundColor: 'rgba(120, 113, 108, 0.15)',
          borderRadius: '4px',
          color: theme.textMuted,
          fontWeight: 500
        }}>
          Manual
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <p style={{ fontSize: '12px', color: theme.textMuted, margin: 0 }}>{label}</p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: color, margin: 0 }}>{displayValue}</p>
        </div>
      </div>
    </div>
  );
}

// New Phase Status View Component
function PhaseStatusView({ phases, getPhaseStatus, getPhaseAgents, getAgentApiCalls, expandedPhases, togglePhaseExpanded, openJsonModal, theme, isDark, currentPhase, handleManualPhaseUpdate, handleCompleteCurrentTask, isInProgress, isInProgressSimulation, nextPhase, availablePhases }) {
  // Map phase keys to standard format for comparison
  const phaseKeyMap = {
    'Intake': 'INTAKE',
    'Application': 'APPLICATION',
    'Disclosure': 'DISCLOSURE',
    'LoanReview': 'LOAN_REVIEW',
    'Underwriting': 'UNDERWRITING',
    'Commitment': 'COMMITMENT',
    'Closing': 'CLOSING',
    'Servicing': 'POST_CLOSING',
  };

  const phaseOrder = ['INTAKE', 'APPLICATION', 'DISCLOSURE', 'LOAN_REVIEW', 'UNDERWRITING', 'COMMITMENT', 'CLOSING', 'POST_CLOSING'];

  const getCurrentPhaseIndex = () => {
    return phaseOrder.indexOf(currentPhase);
  };

  const getPhaseIndex = (phaseKey) => {
    const normalizedKey = phaseKeyMap[phaseKey] || phaseKey;
    return phaseOrder.indexOf(normalizedKey);
  };

  const isPhaseDisabled = (phaseKey) => {
    // Disable future phases when in-progress (especially for in-progress simulation)
    if (!isInProgress && !isInProgressSimulation) return false;
    const currentIdx = getCurrentPhaseIndex();
    const phaseIdx = getPhaseIndex(phaseKey);
    return phaseIdx > currentIdx;
  };

  const isCurrentActivePhase = (phaseKey) => {
    const normalizedKey = phaseKeyMap[phaseKey] || phaseKey;
    return normalizedKey === currentPhase;
  };

  const getNextPhaseKey = () => {
    const currentIdx = getCurrentPhaseIndex();
    if (currentIdx < phaseOrder.length - 1) {
      return phaseOrder[currentIdx + 1];
    }
    return null;
  };

  const statusColors = {
    completed: theme.success,
    active: theme.brand,
    active_no_data: theme.warning,
    pending: theme.pending,
    failed: theme.error,
    disabled: theme.textMuted,
  };

  const statusLabels = {
    completed: 'Completed',
    active: 'In Progress',
    active_no_data: 'Awaiting Completion',
    pending: 'Pending',
    failed: 'Failed',
    disabled: 'Not Started',
  };

  // Check if a phase has data using availablePhases info
  const phaseHasData = (phaseKey) => {
    if (!availablePhases?.phases) return true;
    const normalizedKey = phaseKeyMap[phaseKey] || phaseKey;
    const phaseInfo = availablePhases.phases.find(p => p.phase === normalizedKey);
    return phaseInfo?.has_data ?? true;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {phases.map((phase) => {
        const status = getPhaseStatus(phase.key);
        const agents = getPhaseAgents(phase.key);
        const isExpanded = expandedPhases[phase.id];
        const disabled = isPhaseDisabled(phase.key);
        const isActive = isCurrentActivePhase(phase.key);
        const hasData = phaseHasData(phase.key);
        // Use the prop nextPhase if provided (for in-progress simulation), otherwise calculate locally
        const calculatedNextPhase = nextPhase || getNextPhaseKey();

        // Determine effective status:
        // - disabled: future phases with no data
        // - active_no_data: current phase with no data (in-progress simulation)
        // - active: current phase with data or processing
        // - completed: past phases
        let effectiveStatus = disabled ? 'disabled' : status;
        if (isActive && isInProgressSimulation && !hasData) {
          effectiveStatus = 'active_no_data';
        }
        const color = statusColors[effectiveStatus];

        return (
          <div
            key={phase.id}
            style={{
              backgroundColor: disabled ? (isDark ? 'rgba(90, 122, 154, 0.1)' : '#F9FAFB') : theme.bgCard,
              border: `1px solid ${disabled ? (isDark ? 'rgba(90, 122, 154, 0.2)' : '#E5E7EB') : theme.borderCard}`,
              borderRadius: '14px',
              overflow: 'hidden',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {/* Phase Header */}
            <div
              onClick={() => !disabled && togglePhaseExpanded(phase.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                borderLeft: `4px solid ${color}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: `${color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: color
                }}>
                  {phase.id}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: disabled ? theme.textMuted : theme.textPrimary, fontSize: '15px' }}>
                    {phase.name}
                    {disabled && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 400 }}>(Waiting)</span>}
                    {effectiveStatus === 'active_no_data' && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 400, color: theme.warning }}>(No Data)</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
                    {disabled
                      ? 'No data - awaiting previous step'
                      : effectiveStatus === 'active_no_data'
                        ? 'Task in progress - click Complete Task to populate data'
                        : `${agents.length} agent${agents.length !== 1 ? 's' : ''} executed`
                    }
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Complete Task button for active phase with no data */}
                {isActive && isInProgressSimulation && !hasData && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteCurrentTask();
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: theme.success,
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    <LuCircleCheck size={14} />
                    Complete Task
                  </button>
                )}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: `${color}15`,
                  color: color,
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {effectiveStatus === 'completed' && <LuCircleCheck size={14} />}
                  {effectiveStatus === 'active' && <LuPlay size={14} />}
                  {effectiveStatus === 'active_no_data' && <LuTriangleAlert size={14} />}
                  {effectiveStatus === 'pending' && <LuClock size={14} />}
                  {effectiveStatus === 'failed' && <LuCircleX size={14} />}
                  {effectiveStatus === 'disabled' && <LuClock size={14} />}
                  {statusLabels[effectiveStatus]}
                </span>
                {!disabled && (isExpanded ? <LuChevronDown size={20} color={theme.textMuted} /> : <LuChevronRight size={20} color={theme.textMuted} />)}
              </div>
            </div>

            {/* Expanded Content - Agents and API Calls */}
            {isExpanded && agents.length > 0 && (
              <div style={{
                padding: '0 20px 20px',
                backgroundColor: theme.bgCardAlt
              }}>
                {agents.map((agent, idx) => {
                  const agentCalls = getAgentApiCalls(agent.agent_name);
                  return (
                    <div
                      key={agent.id || idx}
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        backgroundColor: theme.bgCard,
                        borderRadius: '10px',
                        border: `1px solid ${theme.borderCard}`
                      }}
                    >
                      {/* Agent Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: isDark ? 'rgba(17, 122, 202, 0.2)' : 'rgba(17, 122, 202, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <LuCpu size={18} color={theme.brand} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: theme.textPrimary, fontSize: '14px' }}>
                              {agent.agent_name}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
                              {agent.agent_type}
                            </p>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: agent.status === 'COMPLETED' ? `${theme.success}20` : agent.status === 'FAILED' ? `${theme.error}20` : `${theme.brand}20`,
                          color: agent.status === 'COMPLETED' ? theme.success : agent.status === 'FAILED' ? theme.error : theme.brand
                        }}>
                          {agent.status}
                        </span>
                      </div>

                      {/* Agent Decision */}
                      {agent.decision && (
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: theme.bgCardAlt,
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>Decision</p>
                          <p style={{ margin: 0, fontSize: '13px', color: theme.brand, fontWeight: 500 }}>{agent.decision}</p>
                        </div>
                      )}

                      {/* Agent Duration */}
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: theme.textMuted }}>
                        {agent.started_at && format(new Date(agent.started_at), 'HH:mm:ss')}
                        {agent.duration_ms && ` • Duration: ${agent.duration_ms}ms`}
                      </p>

                      {/* API Calls for this agent */}
                      {agentCalls.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: theme.textSecondary, textTransform: 'uppercase' }}>
                            API Calls ({agentCalls.length})
                          </p>
                          {agentCalls.map((call, callIdx) => (
                            <div
                              key={call.id || callIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                backgroundColor: theme.bgCardAlt,
                                borderRadius: '8px',
                                marginBottom: '8px',
                                border: `1px solid ${theme.borderCard}`
                              }}
                            >
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: theme.textPrimary }}>
                                  {call.api_name}
                                  <span style={{ marginLeft: '8px', fontSize: '11px', color: theme.textMuted, fontWeight: 400 }}>
                                    {call.method}
                                  </span>
                                </p>
                                <p style={{ margin: 0, fontSize: '11px', color: theme.textMuted }}>{call.endpoint}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: call.status_code >= 200 && call.status_code < 300 ? `${theme.success}20` : `${theme.error}20`,
                                  color: call.status_code >= 200 && call.status_code < 300 ? theme.success : theme.error
                                }}>
                                  {call.status_code}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openJsonModal(
                                      `${call.api_name} - ${call.endpoint}`,
                                      call.request_payload,
                                      call.response_payload
                                    );
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: `1px solid ${theme.borderCard}`,
                                    backgroundColor: theme.bgCard,
                                    color: theme.brand,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <LuEye size={12} />
                                  View JSON
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No agents message */}
            {isExpanded && agents.length === 0 && !disabled && (
              <div style={{
                padding: '20px',
                backgroundColor: theme.bgCardAlt,
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: theme.textMuted, fontSize: '13px' }}>
                  No agents have executed in this phase yet
                </p>
              </div>
            )}

            {/* Disabled phase message */}
            {disabled && (
              <div style={{
                padding: '20px',
                backgroundColor: isDark ? 'rgba(90, 122, 154, 0.05)' : '#F9FAFB',
                textAlign: 'center',
                borderTop: `1px dashed ${isDark ? 'rgba(90, 122, 154, 0.2)' : '#E5E7EB'}`
              }}>
                <p style={{ margin: 0, color: theme.textMuted, fontSize: '13px', fontStyle: 'italic' }}>
                  Not Applicable : Manually Updated By User
                </p>
                <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: '11px' }}>
                  Complete the previous step to proceed to this phase
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExecutionsList({ executions, theme, isDark }) {
  if (executions.length === 0) {
    return <p style={{ color: theme.textMuted, textAlign: 'center', padding: '32px' }}>No agent executions recorded</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
      {executions.map((exec) => (
        <div
          key={exec.id}
          style={{
            backgroundColor: theme.bgCardAlt,
            borderRadius: '10px',
            padding: '16px',
            borderLeft: `4px solid ${exec.status === 'COMPLETED' ? theme.success : exec.status === 'FAILED' ? theme.error : theme.brand}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: theme.textPrimary }}>{exec.agent_name}</p>
              <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
                {exec.agent_type} | Phase: {exec.phase}
              </p>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: exec.status === 'COMPLETED' ? `${theme.success}20` : exec.status === 'FAILED' ? `${theme.error}20` : `${theme.brand}20`,
              color: exec.status === 'COMPLETED' ? theme.success : exec.status === 'FAILED' ? theme.error : theme.brand
            }}>
              {exec.status}
            </span>
          </div>
          {exec.decision && (
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: theme.textSecondary }}>
              Decision: <span style={{ color: theme.brand, fontWeight: 500 }}>{exec.decision}</span>
            </p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: theme.textMuted }}>
            {format(new Date(exec.started_at), 'HH:mm:ss')}
            {exec.duration_ms && ` | ${exec.duration_ms}ms`}
          </p>
        </div>
      ))}
    </div>
  );
}

function TransactionsList({ transactions, theme, isDark }) {
  if (transactions.length === 0) {
    return <p style={{ color: theme.textMuted, textAlign: 'center', padding: '32px' }}>No transactions recorded</p>;
  }

  const eventColors = {
    STATE_CHANGE: theme.brand,
    DECISION: theme.success,
    AGENT_START: theme.warning,
    AGENT_END: theme.textMuted,
    ERROR: theme.error,
    HUMAN_INPUT: '#8B5CF6',
  };

  return (
    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
      {transactions.map((tx) => (
        <div key={tx.id} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px 0',
          borderBottom: `1px solid ${theme.borderCard}`
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: eventColors[tx.event_type] || theme.textMuted,
            marginTop: '6px',
            flexShrink: 0
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: theme.textPrimary }}>{tx.event_name}</p>
              <span style={{ fontSize: '11px', color: theme.textMuted }}>
                {format(new Date(tx.timestamp), 'HH:mm:ss')}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tx.description}
            </p>
            {tx.source_agent && (
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: theme.textMuted }}>Agent: {tx.source_agent}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApiCallsList({ calls, openJsonModal, theme, isDark }) {
  if (calls.length === 0) {
    return <p style={{ color: theme.textMuted, textAlign: 'center', padding: '32px' }}>No API calls recorded</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
      {calls.map((call) => (
        <div key={call.id} style={{
          backgroundColor: theme.bgCardAlt,
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: theme.textPrimary }}>
                {call.api_name}
                <span style={{ marginLeft: '8px', fontSize: '11px', color: theme.textMuted, fontWeight: 400 }}>{call.method}</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textMuted }}>{call.endpoint}</p>
              {call.agent_name && (
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: theme.textSecondary }}>Agent: {call.agent_name}</p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: call.status_code >= 200 && call.status_code < 300 ? `${theme.success}20` : `${theme.error}20`,
                color: call.status_code >= 200 && call.status_code < 300 ? theme.success : theme.error
              }}>
                {call.status_code}
              </span>
              <button
                onClick={() => openJsonModal(
                  `${call.api_name} - ${call.endpoint}`,
                  call.request_payload,
                  call.response_payload
                )}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.borderCard}`,
                  backgroundColor: theme.bgCard,
                  color: theme.brand,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LuEye size={12} />
                View JSON
              </button>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '11px', color: theme.textMuted }}>
            {format(new Date(call.timestamp), 'HH:mm:ss')}
            {call.duration_ms && ` | ${call.duration_ms}ms`}
          </p>
        </div>
      ))}
    </div>
  );
}

export default ApplicationDetail;
