/**
 * Allocation Tab Component for Admin Dashboard
 * Manages specialist phase allocation with drag-and-drop
 */
import React from 'react';
import {
  Users,
  UserX,
  RefreshCw,
  BarChart3,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { COLORS, SPECIALTY_TYPES, REALLOCATION_REASONS } from './adminStyles';
import { format } from 'date-fns';

const AllocationTab = ({
  specialists,
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
  handleRemoveDualPhase,
  allocationHistory,
  loadingHistory,
  historySearchQuery,
  setHistorySearchQuery,
  specialistTaskStats,
  reasonsChartRef,
  specialistChartRef,
  timelineChartRef,
  tasksCompletedChartRef,
  isDark,
  styles,
}) => {
  const colors = COLORS;

  // Filter unallocated specialists
  const unallocatedSpecialists = specialists.filter(s =>
    s.role !== 'admin' && (!s.specialty_type || s.specialty_type === '' || s.specialty_type === 'NOT_ALLOCATED' || s.specialty_type === null)
  );

  // Filter history based on search
  const filteredHistory = allocationHistory.filter(event => {
    if (!historySearchQuery) return true;
    const query = historySearchQuery.toLowerCase();
    return (
      event.specialist_name?.toLowerCase().includes(query) ||
      event.from_phase?.toLowerCase().includes(query) ||
      event.to_phase?.toLowerCase().includes(query) ||
      event.reason?.toLowerCase().includes(query) ||
      event.event_type?.toLowerCase().includes(query)
    );
  });

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <Users size={18} color={colors.chaseBlue} />
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
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
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
          {[
            { id: 'buckets', label: 'Allocation Buckets', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'history', label: 'History', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
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
                background: allocationSubTab === tab.id ? colors.chaseBlue : 'transparent',
                color: allocationSubTab === tab.id ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
              }}
              onClick={() => setAllocationSubTab(tab.id)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Allocation Buckets Sub-Tab */}
        {allocationSubTab === 'buckets' && (
          <>
            {/* Not Allocated Section */}
            <NotAllocatedBucket
              specialists={unallocatedSpecialists}
              dragOverBucket={dragOverBucket}
              setDragOverBucket={setDragOverBucket}
              draggedSpecialist={draggedSpecialist}
              setDraggedSpecialist={setDraggedSpecialist}
              setHoveredSpecialist={setHoveredSpecialist}
              handleAllocationDrop={handleAllocationDrop}
              isDark={isDark}
              styles={styles}
              colors={colors}
            />

            {/* Phase Buckets */}
            <div style={styles.allocationContainer}>
              {SPECIALTY_TYPES.map((phase) => (
                <PhaseBucket
                  key={phase}
                  phase={phase}
                  specialists={specialists}
                  dragOverBucket={dragOverBucket}
                  setDragOverBucket={setDragOverBucket}
                  draggedSpecialist={draggedSpecialist}
                  setDraggedSpecialist={setDraggedSpecialist}
                  setHoveredSpecialist={setHoveredSpecialist}
                  handleAllocationDrop={handleAllocationDrop}
                  handleRemoveDualPhase={handleRemoveDualPhase}
                  isDark={isDark}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </div>
          </>
        )}

        {/* Analytics Sub-Tab */}
        {allocationSubTab === 'analytics' && (
          <AllocationAnalytics
            reasonsChartRef={reasonsChartRef}
            specialistChartRef={specialistChartRef}
            timelineChartRef={timelineChartRef}
            tasksCompletedChartRef={tasksCompletedChartRef}
            specialistTaskStats={specialistTaskStats}
            isDark={isDark}
            styles={styles}
            colors={colors}
          />
        )}

        {/* History Sub-Tab */}
        {allocationSubTab === 'history' && (
          <AllocationHistory
            history={filteredHistory}
            loading={loadingHistory}
            searchQuery={historySearchQuery}
            setSearchQuery={setHistorySearchQuery}
            isDark={isDark}
            styles={styles}
            colors={colors}
          />
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredSpecialist && (
        <SpecialistTooltip
          specialist={hoveredSpecialist.specialist}
          x={hoveredSpecialist.x}
          y={hoveredSpecialist.y}
          isDark={isDark}
          colors={colors}
        />
      )}
    </div>
  );
};

// Not Allocated Bucket Component
const NotAllocatedBucket = ({
  specialists,
  dragOverBucket,
  setDragOverBucket,
  draggedSpecialist,
  setDraggedSpecialist,
  setHoveredSpecialist,
  handleAllocationDrop,
  isDark,
  styles,
  colors,
}) => {
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
          <UserX size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Not Allocated (Out for the Day)
        </span>
        <span style={{ ...styles.bucketCount, background: `${colors.orange}20`, color: colors.orange }}>
          {specialists.length}
        </span>
      </div>
      <div style={{ ...styles.bucketContent, minHeight: '80px' }}>
        {specialists.map((specialist) => (
          <SpecialistChip
            key={specialist.id}
            specialist={specialist}
            isDragging={draggedSpecialist === specialist.id}
            setDraggedSpecialist={setDraggedSpecialist}
            setDragOverBucket={setDragOverBucket}
            setHoveredSpecialist={setHoveredSpecialist}
            isDark={isDark}
            styles={styles}
          />
        ))}
        {specialists.length === 0 && (
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
};

// Phase Bucket Component
const PhaseBucket = ({
  phase,
  specialists,
  dragOverBucket,
  setDragOverBucket,
  draggedSpecialist,
  setDraggedSpecialist,
  setHoveredSpecialist,
  handleAllocationDrop,
  handleRemoveDualPhase,
  isDark,
  styles,
  colors,
}) => {
  const phaseSpecialists = specialists.filter(s =>
    s.role !== 'admin' && (
      s.specialty_type === phase ||
      (s.dual_phase && s.dual_phases && s.dual_phases.includes(phase))
    )
  );
  const isOver = dragOverBucket === phase;

  return (
    <div
      style={{
        ...styles.allocationBucket,
        ...(isOver ? styles.allocationBucketDragOver : {}),
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
        <span style={styles.bucketTitle}>{phase.replace('_', ' ')}</span>
        <span style={styles.bucketCount}>{phaseSpecialists.length}</span>
      </div>
      <div style={styles.bucketContent}>
        {phaseSpecialists.map((specialist) => {
          const isDualPhase = specialist.dual_phase && specialist.dual_phases && specialist.dual_phases.length > 1;
          return (
            <SpecialistChip
              key={specialist.id}
              specialist={specialist}
              isDragging={draggedSpecialist === specialist.id}
              isDualPhase={isDualPhase}
              currentPhase={phase}
              setDraggedSpecialist={setDraggedSpecialist}
              setDragOverBucket={setDragOverBucket}
              setHoveredSpecialist={setHoveredSpecialist}
              handleRemoveDualPhase={handleRemoveDualPhase}
              isDark={isDark}
              styles={styles}
            />
          );
        })}
        {phaseSpecialists.length === 0 && (
          <div style={{
            color: isDark ? '#475569' : '#94a3b8',
            fontSize: '11px',
            padding: '20px',
            textAlign: 'center',
            width: '100%',
          }}>
            Drop specialists here
          </div>
        )}
      </div>
    </div>
  );
};

// Specialist Chip Component
const SpecialistChip = ({
  specialist,
  isDragging,
  isDualPhase,
  currentPhase,
  setDraggedSpecialist,
  setDragOverBucket,
  setHoveredSpecialist,
  handleRemoveDualPhase,
  isDark,
  styles,
}) => {
  const taskCount = (specialist.pending_tasks_count || 0) + (specialist.in_progress_tasks_count || 0);
  const certCount = (specialist.specialty_types || []).length;

  return (
    <div
      draggable
      style={{
        ...styles.specialistChip,
        ...(isDragging ? styles.specialistChipDragging : {}),
        position: 'relative',
        background: isDualPhase
          ? 'linear-gradient(90deg, rgba(24, 95, 165, 0.15) 50%, rgba(13, 148, 136, 0.15) 50%)'
          : styles.specialistChip?.background,
        border: isDualPhase
          ? '1px solid rgba(24, 95, 165, 0.3)'
          : styles.specialistChip?.border,
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
      {isDualPhase && handleRemoveDualPhase && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveDualPhase(specialist, currentPhase);
          }}
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          title="Remove from this phase"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
};

// Specialist Tooltip Component
const SpecialistTooltip = ({ specialist, x, y, isDark, colors }) => {
  const certifications = specialist.specialty_types || [];

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y - 10,
      transform: 'translate(-50%, -100%)',
      background: isDark ? '#1e293b' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      zIndex: 1000,
      minWidth: '200px',
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '8px' }}>
        {specialist.full_name}
      </div>
      {certifications.length > 0 && (
        <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
          <div style={{ marginBottom: '4px', fontWeight: '500' }}>Certifications:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {certifications.map(cert => (
              <span key={cert} style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${colors.primary}15`,
                color: colors.primary,
                fontSize: '10px',
                fontWeight: '600',
              }}>
                {cert.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Allocation Analytics Component
const AllocationAnalytics = ({
  reasonsChartRef,
  specialistChartRef,
  timelineChartRef,
  tasksCompletedChartRef,
  specialistTaskStats,
  isDark,
  styles,
  colors,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Reasons Chart */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '16px' }}>
          Reallocation Reasons
        </div>
        <div ref={reasonsChartRef} style={{ minHeight: '280px' }} />
      </div>

      {/* Specialist Chart */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '16px' }}>
          Reallocations by Specialist
        </div>
        <div ref={specialistChartRef} style={{ minHeight: '280px' }} />
      </div>

      {/* Tasks Completed Chart */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '16px' }}>
          Tasks Completed by Specialist
        </div>
        <div ref={tasksCompletedChartRef} style={{ minHeight: '280px' }} />
      </div>

      {/* Timeline Chart */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px',
        padding: '20px',
        gridColumn: '1 / -1',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '16px' }}>
          Allocation Timeline
        </div>
        <div ref={timelineChartRef} style={{ minHeight: '200px' }} />
      </div>
    </div>
  );
};

// Allocation History Component
const AllocationHistory = ({
  history,
  loading,
  searchQuery,
  setSearchQuery,
  isDark,
  styles,
  colors,
}) => {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'INITIAL_ALLOCATION': return <CheckCircle size={14} color={colors.success} />;
      case 'REALLOCATION': return <ArrowRight size={14} color={colors.warning} />;
      case 'MOVED_TO_UNALLOCATED': return <UserX size={14} color={colors.orange} />;
      case 'TASK_REASSIGNMENT': return <ArrowRight size={14} color={colors.primary} />;
      default: return <Clock size={14} color={colors.primary} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '12px' }} />
        Loading history...
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          maxWidth: '300px',
        }}>
          <Search size={16} color={isDark ? '#64748b' : '#94a3b8'} />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: isDark ? '#e2e8f0' : '#1e293b',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: isDark ? '#64748b' : '#94a3b8' }}>
            No allocation history found
          </div>
        ) : (
          history.slice(0, 50).map((event) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {getEventIcon(event.event_type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  {event.specialist_name}
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
                  {event.from_phase && event.to_phase
                    ? `${event.from_phase.replace('_', ' ')} → ${event.to_phase.replace('_', ' ')}`
                    : event.event_type.replace('_', ' ')}
                  {event.reason && ` · ${REALLOCATION_REASONS.find(r => r.id === event.reason)?.label || event.reason}`}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#475569' : '#94a3b8' }}>
                {format(new Date(event.created_at), 'MMM d, h:mm a')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllocationTab;
