/**
 * Allocation Tab Component for Admin Dashboard
 * Manages specialist phase allocation with drag-and-drop
 */
import React from 'react';
import {
  LuUsers,
  LuUserX,
  LuRefreshCw,
  LuChartBar,
  LuClock,
  LuSearch,
  LuX,
  LuChartPie,
  LuTrendingUp,
  LuActivity,
  LuCircleCheck,
  LuDatabase,
  LuUserCheck,
  LuArrowUpRight,
  LuGitBranch,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuBook,
  LuArrowLeftRight,
  LuClipboardList,
} from 'react-icons/lu';
import { COLORS, SPECIALTY_TYPES } from './adminStyles';

const AllocationTab = ({
  specialists,
  workflowTasks = [], // New prop for dynamic phases
  allocationSubTab,
  setAllocationSubTab,
  updatingAllocation,
  draggedSpecialist,
  setDraggedSpecialist,
  dragOverBucket,
  setDragOverBucket,
  hoveredSpecialist,
  setHoveredSpecialist,
  handleAllocationDrop,
  handleDualRemovalOpen,
  allocationHistory,
  loadingHistory,
  historySearchQuery,
  setHistorySearchQuery,
  fetchAllocationHistory,
  specialistTaskStats,
  reasonsChartRef,
  specialistChartRef,
  timelineChartRef,
  tasksCompletedChartRef,
  flowChartRef,
  // New props for Directory sub-tab
  searchQuery,
  setSearchQuery,
  filteredSpecialists,
  openCreateModal,
  openEditModal,
  showDeleteConfirm,
  loading,
  allAdminTasks = [], // All tasks for displaying in directory
  onInBucketTaskReassign, // Callback for reassigning tasks within same bucket
  isDark,
  styles,
}) => {
  // Local state for tasks popup (Directory)
  const [tasksPopup, setTasksPopup] = React.useState(null); // { specialist, tasks }

  // Local state for in-bucket task management
  const [taskManagementPanel, setTaskManagementPanel] = React.useState(null); // { specialist, phase, tasks }
  const [reassigningTaskId, setReassigningTaskId] = React.useState(null);

  const onTaskCountClick = (specialist, tasks) => {
    setTasksPopup({ specialist, tasks });
  };

  // Open task management panel for a specialist in a bucket
  const openTaskManagement = (specialist, phase) => {
    const specialistTasks = allAdminTasks.filter(t =>
      t.specialist_id === specialist.id && t.phase === phase
    );
    setTaskManagementPanel({ specialist, phase, tasks: specialistTasks });
  };

  // Get other specialists in the same bucket for reassignment
  const getOtherSpecialistsInBucket = (phase, currentSpecialistId) => {
    return specialists.filter(s =>
      s.role !== 'admin' &&
      s.id !== currentSpecialistId &&
      (
        s.specialty_type === phase ||
        (s.dual_phase && s.dual_phases && s.dual_phases.includes(phase))
      )
    );
  };

  // Handle task reassignment within bucket
  const handleInBucketReassign = async (taskId, newSpecialistId) => {
    setReassigningTaskId(taskId);
    try {
      if (onInBucketTaskReassign) {
        await onInBucketTaskReassign(taskId, newSpecialistId);
        // Update local state
        setTaskManagementPanel(prev => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: prev.tasks.filter(t => t.id !== taskId)
          };
        });
      }
    } catch (error) {
      console.error('Failed to reassign task:', error);
    }
    setReassigningTaskId(null);
  };
  const colors = COLORS;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <LuUsers size={18} color={colors.chaseBlue} />
          Specialist Phase Allocation
        </div>
        <span style={{
          fontSize: '12px',
          color: isDark ? '#64748b' : '#94a3b8',
        }}>
          Drag specialists to reassign them to different phases
        </span>
      </div>
      <div style={{ ...styles.cardBody, padding: '20px', position: 'relative' }}>
        {updatingAllocation && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark ? 'rgba(13, 21, 38, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary }}>
              <LuRefreshCw size={20} className="animate-spin" />
              Updating allocation...
            </div>
          </div>
        )}

        {/* Sub-Tab Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '24px',
          padding: '4px',
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
          borderRadius: '12px',
          width: 'fit-content',
        }}>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: allocationSubTab === 'buckets'
                ? (isDark ? colors.chaseBlue : colors.chaseBlue)
                : 'transparent',
              color: allocationSubTab === 'buckets'
                ? '#ffffff'
                : (isDark ? '#94a3b8' : '#64748b'),
            }}
            onClick={() => setAllocationSubTab('buckets')}
          >
            <LuUsers size={16} />
            Allocation Buckets
          </button>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: allocationSubTab === 'analytics'
                ? (isDark ? colors.chaseBlue : colors.chaseBlue)
                : 'transparent',
              color: allocationSubTab === 'analytics'
                ? '#ffffff'
                : (isDark ? '#94a3b8' : '#64748b'),
            }}
            onClick={() => setAllocationSubTab('analytics')}
          >
            <LuChartBar size={16} />
            Analytics
          </button>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: allocationSubTab === 'history'
                ? (isDark ? colors.chaseBlue : colors.chaseBlue)
                : 'transparent',
              color: allocationSubTab === 'history'
                ? '#ffffff'
                : (isDark ? '#94a3b8' : '#64748b'),
            }}
            onClick={() => setAllocationSubTab('history')}
          >
            <LuClock size={16} />
            History
          </button>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: allocationSubTab === 'directory'
                ? (isDark ? colors.chaseBlue : colors.chaseBlue)
                : 'transparent',
              color: allocationSubTab === 'directory'
                ? '#ffffff'
                : (isDark ? '#94a3b8' : '#64748b'),
            }}
            onClick={() => setAllocationSubTab('directory')}
          >
            <LuBook size={16} />
            Directory
          </button>
        </div>

        {/* Allocation Buckets Sub-Tab */}
        {allocationSubTab === 'buckets' && (
          <>
            {/* Not Allocated Section */}
            {(() => {
              const unallocatedSpecialists = specialists.filter(s =>
                s.role !== 'admin' && (!s.specialty_type || s.specialty_type === '' || s.specialty_type === 'NOT_ALLOCATED' || s.specialty_type === null)
              );
              const isOver = dragOverBucket === 'NOT_ALLOCATED';

              return (
                <div
                  style={{
                    borderRadius: '16px',
                    minHeight: '200px',
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                    marginBottom: '20px',
                    background: isOver
                      ? (isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.12)')
                      : (isDark ? 'rgba(249, 115, 22, 0.08)' : 'rgba(249, 115, 22, 0.05)'),
                    borderWidth: '2px',
                    borderStyle: 'dashed',
                    borderColor: isOver
                      ? colors.orange
                      : (isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.3)'),
                    boxShadow: isOver ? `0 0 20px ${colors.orange}40` : 'none',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverBucket('NOT_ALLOCATED');
                  }}
                  onDragLeave={() => setDragOverBucket(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const specialistId = e.dataTransfer.getData('specialistId');
                    if (specialistId) {
                      handleAllocationDrop(parseInt(specialistId), 'NOT_ALLOCATED');
                    }
                  }}
                >
                  <div style={{
                    ...styles.bucketHeader,
                    background: isDark ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.08)',
                  }}>
                    <span style={{ ...styles.bucketTitle, color: colors.orange }}>
                      <LuUserX size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Not Allocated (Out for the Day)
                    </span>
                    <span style={{ ...styles.bucketCount, background: `${colors.orange}20`, color: colors.orange }}>
                      {unallocatedSpecialists.length}
                    </span>
                  </div>
                  <div style={{ ...styles.bucketContent, minHeight: '80px' }}>
                    {unallocatedSpecialists.map((specialist) => {
                      const isDragging = draggedSpecialist === specialist.id;
                      const taskCount = (specialist.pending_tasks_count || 0) + (specialist.in_progress_tasks_count || 0);
                      const certCount = (specialist.specialty_types || []).length;

                      return (
                        <div
                          key={specialist.id}
                          draggable
                          style={{
                            ...styles.specialistChip,
                            ...(isDragging ? styles.specialistChipDragging : {}),
                            position: 'relative',
                          }}
                          onDragStart={(e) => {
                            setDraggedSpecialist(specialist.id);
                            e.dataTransfer.setData('specialistId', specialist.id.toString());
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedSpecialist(null);
                            setDragOverBucket(null);
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredSpecialist({
                              specialist,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredSpecialist(null)}
                        >
                          <div style={styles.specialistAvatar}>
                            {specialist.full_name?.charAt(0)?.toUpperCase() || specialist.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div style={styles.specialistInfo}>
                            <span style={styles.specialistName}>
                              {specialist.full_name || specialist.username}
                            </span>
                            <span style={styles.specialistTasks}>
                              {certCount > 0 ? `${certCount} cert${certCount > 1 ? 's' : ''} · ` : ''}{taskCount} task{taskCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {unallocatedSpecialists.length === 0 && (
                      <div style={{
                        color: isDark ? '#475569' : '#94a3b8',
                        fontSize: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        width: '100%',
                        fontStyle: 'italic',
                      }}>
                        Drag specialists here when they are out for the day
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Phase Buckets - Now driven by workflow tasks */}
            <div style={styles.allocationContainer}>
              {(workflowTasks.length > 0 ? workflowTasks : SPECIALTY_TYPES.map(p => ({ phase_code: p, name: p.replace('_', ' '), color: '#0a4b94' }))).map((task) => {
                const phase = typeof task === 'string' ? task : task.phase_code;
                const phaseName = typeof task === 'string' ? task.replace('_', ' ') : task.name;
                const phaseColor = typeof task === 'string' ? '#0a4b94' : (task.color || '#0a4b94');
                const phaseSpecialists = specialists.filter(s =>
                  s.role !== 'admin' && (
                    s.specialty_type === phase ||
                    (s.dual_phase && s.dual_phases && s.dual_phases.includes(phase))
                  )
                );
                const isOver = dragOverBucket === phase;

                return (
                  <div
                    key={phase}
                    style={{
                      ...styles.allocationBucket,
                      ...(isOver ? styles.allocationBucketDragOver : {}),
                      borderTop: `3px solid ${phaseColor}`,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverBucket(phase);
                    }}
                    onDragLeave={() => setDragOverBucket(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const specialistId = e.dataTransfer.getData('specialistId');
                      if (specialistId) {
                        handleAllocationDrop(parseInt(specialistId), phase);
                      }
                    }}
                  >
                    <div style={styles.bucketHeader}>
                      <span style={{ ...styles.bucketTitle, color: phaseColor }}>{phaseName}</span>
                      <span style={styles.bucketCount}>{phaseSpecialists.length}</span>
                    </div>
                    <div style={styles.bucketContent}>
                      {phaseSpecialists.map((specialist) => {
                        const isDragging = draggedSpecialist === specialist.id;
                        const taskCount = (specialist.pending_tasks_count || 0) + (specialist.in_progress_tasks_count || 0);
                        const certCount = (specialist.specialty_types || []).length;
                        const isDualPhase = specialist.dual_phase && specialist.dual_phases && specialist.dual_phases.length > 1;

                        return (
                          <div
                            key={specialist.id}
                            draggable
                            style={{
                              ...styles.specialistChip,
                              ...(isDragging ? styles.specialistChipDragging : {}),
                              position: 'relative',
                              background: isDualPhase
                                ? `linear-gradient(90deg, rgba(24, 95, 165, 0.15) 50%, rgba(13, 148, 136, 0.15) 50%)`
                                : styles.specialistChip.background,
                              border: isDualPhase
                                ? '1px solid rgba(24, 95, 165, 0.3)'
                                : styles.specialistChip.border,
                            }}
                            onDragStart={(e) => {
                              setDraggedSpecialist(specialist.id);
                              e.dataTransfer.setData('specialistId', specialist.id.toString());
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedSpecialist(null);
                              setDragOverBucket(null);
                            }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredSpecialist({
                                specialist,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setHoveredSpecialist(null)}
                          >
                            <div style={{
                              ...styles.specialistAvatar,
                              background: isDualPhase
                                ? 'linear-gradient(135deg, #185FA5 0%, #0d9488 100%)'
                                : styles.specialistAvatar.background,
                              position: 'relative',
                            }}>
                              {specialist.full_name?.charAt(0)?.toUpperCase() || specialist.username?.charAt(0)?.toUpperCase() || '?'}
                              {isDualPhase && (
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
                            <div style={styles.specialistInfo}>
                              <span style={styles.specialistName}>
                                {specialist.full_name || specialist.username}
                                {isDualPhase ? (
                                  <span style={{
                                    marginLeft: '6px',
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: 'rgba(24, 95, 165, 0.2)',
                                    color: '#185FA5',
                                  }}>
                                    DUAL
                                  </span>
                                ) : certCount > 1 && (
                                  <span style={{
                                    marginLeft: '6px',
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: `${colors.success}20`,
                                    color: colors.success,
                                  }}>
                                    {certCount} certs
                                  </span>
                                )}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={styles.specialistTasks}>
                                  {isDualPhase
                                    ? `${specialist.dual_phases.map(p => p.replace(/_/g, ' ')).join(' + ')}`
                                    : `${taskCount} active task${taskCount !== 1 ? 's' : ''}`
                                  }
                                </span>
                                {/* Task management button - only show if specialist has tasks */}
                                {taskCount > 0 && !isDualPhase && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      openTaskManagement(specialist, phase);
                                    }}
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: `${colors.chaseBlue}20`,
                                      color: colors.chaseBlue,
                                      cursor: 'pointer',
                                      fontSize: '9px',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = colors.chaseBlue;
                                      e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = `${colors.chaseBlue}20`;
                                      e.currentTarget.style.color = colors.chaseBlue;
                                    }}
                                    title="Manage tasks"
                                  >
                                    <LuArrowLeftRight size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Delete button for dual-phase specialists */}
                            {isDualPhase && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDualRemovalOpen(specialist, phase);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                                  transition: 'all 0.2s ease',
                                  opacity: 0.9,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)';
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(239, 68, 68, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                  e.currentTarget.style.opacity = '0.9';
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
                                }}
                                title={`Remove ${specialist.full_name || specialist.username} from ${phase.replace(/_/g, ' ')}`}
                              >
                                <LuX size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {phaseSpecialists.length === 0 && (
                        <div style={{
                          color: isDark ? '#475569' : '#94a3b8',
                          fontSize: '12px',
                          padding: '20px',
                          textAlign: 'center',
                          width: '100%',
                        }}>
                          No specialists assigned
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Analytics Sub-Tab */}
        {allocationSubTab === 'analytics' && (
          <div style={{ minHeight: '400px' }}>
            {allocationHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: isDark ? '#64748b' : '#94a3b8',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                borderRadius: '16px',
              }}>
                <LuChartBar size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  No Analytics Data Yet
                </div>
                <div style={{ fontSize: '13px' }}>
                  Start reallocating specialists to see analytics here
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
              }}>
                {/* Reasons Distribution Chart */}
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${colors.chaseBlue}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <LuChartPie size={16} color={colors.chaseBlue} />
                    </div>
                    Reallocation Reasons
                  </div>
                  <div ref={reasonsChartRef} style={{ height: '280px' }} />
                </div>

                {/* Right Column: Stacked Specialist Charts */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  {/* Reallocations by Specialist */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '16px',
                    padding: '16px',
                    flex: 1,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: `${colors.success}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <LuUsers size={14} color={colors.success} />
                      </div>
                      Reallocations by Specialist
                    </div>
                    <div ref={specialistChartRef} style={{ height: '200px' }} />
                  </div>

                  {/* Tasks Completed by Specialist */}
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '16px',
                    padding: '16px',
                    flex: 1,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <LuCircleCheck size={14} color="#22c55e" />
                        </div>
                        Tasks Completed
                      </div>
                    </div>
                    {specialistTaskStats.length > 0 ? (
                      <div ref={tasksCompletedChartRef} style={{ height: '200px' }} />
                    ) : (
                      <div style={{
                        height: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDark ? '#64748b' : '#94a3b8',
                      }}>
                        <LuCircleCheck size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontSize: '12px' }}>No data yet</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Chart - Full Width */}
                <div style={{
                  gridColumn: 'span 2',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${colors.orange}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <LuTrendingUp size={16} color={colors.orange} />
                    </div>
                    Reallocation Timeline
                  </div>
                  <div ref={timelineChartRef} style={{ height: '200px' }} />
                </div>

                {/* Event Type Distribution */}
                <div style={{
                  gridColumn: 'span 2',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${colors.primary}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <LuActivity size={16} color={colors.primary} />
                    </div>
                    Event Type Distribution
                  </div>
                  <div ref={flowChartRef} style={{ height: '120px' }} />
                </div>

                {/* Summary Stats */}
                <div style={{
                  gridColumn: 'span 2',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                }}>
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: colors.chaseBlue,
                      marginBottom: '4px',
                    }}>
                      {allocationHistory.length}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      fontWeight: '500',
                    }}>
                      Total Events
                    </div>
                  </div>
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: colors.orange,
                      marginBottom: '4px',
                    }}>
                      {allocationHistory.filter(e => e.event_type === 'MOVED_TO_UNALLOCATED').length}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      fontWeight: '500',
                    }}>
                      Out of Office
                    </div>
                  </div>
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: colors.success,
                      marginBottom: '4px',
                    }}>
                      {allocationHistory.filter(e => e.event_type === 'TASK_REASSIGNMENT').length}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      fontWeight: '500',
                    }}>
                      Task Reassignments
                    </div>
                  </div>
                  <div style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: colors.primary,
                      marginBottom: '4px',
                    }}>
                      {new Set(allocationHistory.map(e => e.specialist_name)).size}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      fontWeight: '500',
                    }}>
                      Unique Specialists
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Sub-Tab */}
        {allocationSubTab === 'history' && (
          <div style={{ minHeight: '200px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '16px',
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#1e293b',
              }}>
                <LuClock size={18} color={colors.chaseBlue} />
                Allocation History
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: '1',
                justifyContent: 'flex-end',
              }}>
                {/* Search Input */}
                <div style={{
                  position: 'relative',
                  maxWidth: '300px',
                  flex: '1',
                }}>
                  <LuSearch
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#64748b' : '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, reason, event type..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <LuX size={12} />
                    </button>
                  )}
                </div>
                <button
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isDark ? 'rgba(24, 95, 165, 0.4)' : 'rgba(24, 95, 165, 0.25)'}`,
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(24, 95, 165, 0.15) 0%, rgba(24, 95, 165, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(24, 95, 165, 0.1) 0%, rgba(24, 95, 165, 0.05) 100%)',
                    color: isDark ? '#93c5fd' : '#185FA5',
                    cursor: loadingHistory ? 'wait' : 'pointer',
                  }}
                  onClick={fetchAllocationHistory}
                  disabled={loadingHistory}
                >
                  <LuRefreshCw size={15} style={loadingHistory ? { animation: 'spin 1s linear infinite' } : {}} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: isDark ? '#64748b' : '#94a3b8',
              }}>
                <LuRefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ marginTop: '12px' }}>Loading history...</div>
              </div>
            ) : allocationHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: isDark ? '#64748b' : '#94a3b8',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                borderRadius: '12px',
              }}>
                <LuDatabase size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px' }}>No allocation history yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Reallocation events will appear here
                </div>
              </div>
            ) : (() => {
              const filteredHistory = allocationHistory.filter(event => {
                if (!historySearchQuery.trim()) return true;
                const query = historySearchQuery.toLowerCase();
                return (
                  (event.specialist_name || '').toLowerCase().includes(query) ||
                  (event.reason || '').toLowerCase().includes(query) ||
                  (event.event_type || '').toLowerCase().includes(query) ||
                  (event.from_phase || '').toLowerCase().includes(query) ||
                  (event.to_phase || '').toLowerCase().includes(query)
                );
              });

              if (filteredHistory.length === 0) {
                return (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: isDark ? '#64748b' : '#94a3b8',
                    background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '12px',
                  }}>
                    <LuSearch size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <div style={{ fontSize: '14px' }}>No results found for "{historySearchQuery}"</div>
                  </div>
                );
              }

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}>
                  {historySearchQuery && (
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      marginBottom: '4px',
                    }}>
                      Showing {filteredHistory.length} of {allocationHistory.length} events
                    </div>
                  )}
                  {filteredHistory.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: event.event_type === 'MOVED_TO_UNALLOCATED'
                          ? `${colors.orange}20`
                          : event.event_type === 'TASK_REASSIGNMENT'
                            ? `${colors.chaseBlue}20`
                            : event.event_type === 'PHASE_TRANSFER'
                              ? 'rgba(24, 95, 165, 0.2)'
                              : event.event_type === 'DUAL_PHASE_REMOVED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : `${colors.success}20`,
                      }}>
                        {event.event_type === 'MOVED_TO_UNALLOCATED' ? (
                          <LuUserX size={18} color={colors.orange} />
                        ) : event.event_type === 'TASK_REASSIGNMENT' ? (
                          <LuArrowUpRight size={18} color={colors.chaseBlue} />
                        ) : event.event_type === 'PHASE_TRANSFER' ? (
                          <LuGitBranch size={18} color="#185FA5" />
                        ) : event.event_type === 'DUAL_PHASE_REMOVED' ? (
                          <LuUserX size={18} color="#ef4444" />
                        ) : (
                          <LuUserCheck size={18} color={colors.success} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: isDark ? '#e2e8f0' : '#1e293b',
                          }}>
                            {event.specialist_name || 'Unknown'}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}>
                            {event.event_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '8px',
                          flexWrap: 'wrap',
                        }}>
                          {event.reason && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                              color: isDark ? '#94a3b8' : '#64748b',
                            }}>
                              {event.reason}
                            </span>
                          )}
                          <span style={{
                            fontSize: '11px',
                            color: isDark ? '#475569' : '#9ca3af',
                          }}>
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: event.event_type === 'MOVED_TO_UNALLOCATED'
                          ? `${colors.orange}15`
                          : event.event_type === 'TASK_REASSIGNMENT'
                            ? `${colors.chaseBlue}15`
                            : event.event_type === 'PHASE_TRANSFER'
                              ? 'rgba(24, 95, 165, 0.15)'
                              : event.event_type === 'DUAL_PHASE_REMOVED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : `${colors.success}15`,
                        color: event.event_type === 'MOVED_TO_UNALLOCATED'
                          ? colors.orange
                          : event.event_type === 'TASK_REASSIGNMENT'
                            ? colors.chaseBlue
                            : event.event_type === 'PHASE_TRANSFER'
                              ? '#185FA5'
                              : event.event_type === 'DUAL_PHASE_REMOVED'
                                ? '#ef4444'
                                : colors.success,
                      }}>
                        {event.event_type === 'MOVED_TO_UNALLOCATED' ? 'Out' :
                          event.event_type === 'TASK_REASSIGNMENT' ? 'Task' :
                            event.event_type === 'PHASE_TRANSFER' ? 'Transfer' :
                              event.event_type === 'DUAL_PHASE_REMOVED' ? 'Removed' : 'Move'}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Directory Sub-Tab - Specialists Table */}
        {allocationSubTab === 'directory' && (
          <div style={{ minHeight: '200px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '16px',
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#1e293b',
              }}>
                <LuUsers size={18} color={colors.chaseBlue} />
                Specialist Directory ({filteredSpecialists?.length || 0})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={styles.searchBar}>
                  <LuSearch size={16} color={isDark ? '#64748b' : '#94a3b8'} />
                  <input
                    type="text"
                    placeholder="Search specialists..."
                    style={styles.searchInput}
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
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
                      <th style={styles.th}>Certifications</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Tasks</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Last Active</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredSpecialists || []).map((specialist) => (
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
                          {(() => {
                            const specialistTasks = allAdminTasks.filter(t => t.specialist_id === specialist.id);
                            const taskCount = specialistTasks.length;
                            const uniquePhases = [...new Set(specialistTasks.map(t => t.phase).filter(Boolean))];
                            const isMultiPhase = uniquePhases.length > 1;

                            if (taskCount === 0) {
                              return (
                                <span style={{
                                  fontSize: '12px',
                                  color: isDark ? '#64748b' : '#94a3b8',
                                  fontStyle: 'italic',
                                }}>
                                  No tasks
                                </span>
                              );
                            }

                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: isMultiPhase
                                    ? 'linear-gradient(90deg, rgba(24, 95, 165, 0.1) 50%, rgba(13, 148, 136, 0.1) 50%)'
                                    : `${colors.primary}08`,
                                  border: isMultiPhase
                                    ? '1px solid rgba(24, 95, 165, 0.25)'
                                    : `1px solid ${colors.primary}20`,
                                }}
                                onClick={() => onTaskCountClick(specialist, specialistTasks)}
                                title="Click to view tasks"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: colors.primary,
                                  }}>
                                    {taskCount} task{taskCount !== 1 ? 's' : ''}
                                  </span>
                                  {isMultiPhase && (
                                    <span style={{
                                      fontSize: '9px',
                                      fontWeight: '700',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'linear-gradient(135deg, #185FA5 0%, #0d9488 100%)',
                                      color: '#fff',
                                    }}>
                                      MULTI
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {uniquePhases.map((phase, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: '9px',
                                        fontWeight: '600',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                        color: isDark ? '#94a3b8' : '#64748b',
                                      }}
                                    >
                                      {phase.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: specialist.is_active ? `${colors.success}20` : `${colors.error}20`,
                            color: specialist.is_active ? colors.success : colors.error,
                          }}>
                            {specialist.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ ...styles.td, fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
                          {specialist.last_login_at
                            ? new Date(specialist.last_login_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              style={{
                                ...styles.actionBtn,
                                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                              }}
                              onClick={() => openEditModal && openEditModal(specialist)}
                              title="Edit"
                            >
                              <LuPencil size={14} />
                            </button>
                            {specialist.role !== 'admin' && (
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  background: `${colors.error}15`,
                                  color: colors.error,
                                }}
                                onClick={() => showDeleteConfirm && showDeleteConfirm('specialist', specialist, specialist.full_name)}
                                title="Delete"
                              >
                                <LuTrash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tasks Popup Modal */}
        {tasksPopup && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setTasksPopup(null)}
          >
            <div
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '70vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.cyan} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '16px',
                  }}>
                    {tasksPopup.specialist.full_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: isDark ? '#f1f5f9' : '#1e293b',
                    }}>
                      {tasksPopup.specialist.full_name || tasksPopup.specialist.username}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#64748b' : '#94a3b8',
                    }}>
                      {tasksPopup.tasks.length} assigned task{tasksPopup.tasks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setTasksPopup(null)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? '#94a3b8' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LuX size={18} />
                </button>
              </div>

              {/* Task List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                {tasksPopup.tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: task.status === 'IN_PROGRESS' ? colors.primary : colors.warning,
                      }} />
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                        }}>
                          {task.application_id || `Task #${task.id}`}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: isDark ? '#64748b' : '#94a3b8',
                        }}>
                          {task.phase?.replace(/_/g, ' ') || 'Unknown Phase'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: task.status === 'IN_PROGRESS'
                        ? `${colors.primary}15`
                        : `${colors.warning}15`,
                      color: task.status === 'IN_PROGRESS' ? colors.primary : colors.warning,
                    }}>
                      {task.status?.replace(/_/g, ' ') || 'ASSIGNED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Task Management Panel - For reassigning tasks within same bucket */}
        {taskManagementPanel && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setTaskManagementPanel(null)}
          >
            <div
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                borderRadius: '16px',
                padding: '0',
                maxWidth: '550px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                background: isDark ? 'rgba(24, 95, 165, 0.1)' : 'rgba(24, 95, 165, 0.05)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${colors.chaseBlue} 0%, ${colors.cyan} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '18px',
                    }}>
                      {taskManagementPanel.specialist.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: '700',
                        color: isDark ? '#f1f5f9' : '#1e293b',
                      }}>
                        {taskManagementPanel.specialist.full_name || taskManagementPanel.specialist.username}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: isDark ? '#64748b' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <LuClipboardList size={12} />
                        {taskManagementPanel.tasks.length} task{taskManagementPanel.tasks.length !== 1 ? 's' : ''} in {taskManagementPanel.phase.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setTaskManagementPanel(null)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      color: isDark ? '#94a3b8' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LuX size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
              }}>
                {taskManagementPanel.tasks.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: isDark ? '#64748b' : '#94a3b8',
                  }}>
                    <LuClipboardList size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>No tasks in this phase</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: isDark ? '#64748b' : '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                    }}>
                      Reassign tasks to another specialist
                    </div>

                    {taskManagementPanel.tasks.map((task) => {
                      const otherSpecialists = getOtherSpecialistsInBucket(taskManagementPanel.phase, taskManagementPanel.specialist.id);
                      const isReassigning = reassigningTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                            opacity: isReassigning ? 0.6 : 1,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: task.status === 'IN_PROGRESS' ? colors.primary : colors.warning,
                              flexShrink: 0,
                            }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDark ? '#e2e8f0' : '#1e293b',
                              }}>
                                {task.application_id || `Task #${task.id}`}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: isDark ? '#64748b' : '#94a3b8',
                              }}>
                                {task.status?.replace(/_/g, ' ') || 'ASSIGNED'}
                              </div>
                            </div>
                          </div>

                          {/* Reassign dropdown */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {otherSpecialists.length > 0 ? (
                              <select
                                disabled={isReassigning}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleInBucketReassign(task.id, parseInt(e.target.value));
                                  }
                                }}
                                value=""
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                  background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                  color: isDark ? '#e2e8f0' : '#1e293b',
                                  fontSize: '12px',
                                  cursor: isReassigning ? 'wait' : 'pointer',
                                  minWidth: '140px',
                                }}
                              >
                                <option value="">
                                  {isReassigning ? 'Reassigning...' : 'Reassign to...'}
                                </option>
                                {otherSpecialists.map((spec) => (
                                  <option key={spec.id} value={spec.id}>
                                    {spec.full_name || spec.username}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{
                                fontSize: '11px',
                                color: isDark ? '#64748b' : '#94a3b8',
                                fontStyle: 'italic',
                              }}>
                                No other specialists
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => setTaskManagementPanel(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: colors.chaseBlue,
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllocationTab;
