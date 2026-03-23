/**
 * Overview Tab Component for Admin Dashboard
 * Displays stats, workload distribution, pipeline, and specialists table
 */
import React from 'react';
import {
  FileText,
  Activity,
  CheckCircle2,
  Users,
  TrendingUp,
  PlayCircle,
  ArrowUpRight,
  Shield,
  Briefcase,
  AlertCircle,
  Layers,
  Clock,
  CheckCircle,
  GitBranch,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { COLORS } from './adminStyles';

const OverviewTab = ({
  stats,
  workload,
  specialists,
  pipelineData,
  searchQuery,
  setSearchQuery,
  isDark,
  styles,
  onAddSpecialist,
  onEditSpecialist,
  onDeleteSpecialist,
}) => {
  const colors = COLORS;

  // Filter specialists based on search
  const filteredSpecialists = specialists.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.specialty_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: `${colors.lightBlue}20` }}>
            <FileText size={24} color={colors.lightBlue} />
          </div>
          <div style={styles.statValue}>{stats.totalApplications}</div>
          <div style={styles.statLabel}>Total Applications</div>
          <div style={{ ...styles.statTrend, color: colors.lightBlue }}>
            <TrendingUp size={14} />
            Active
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: `${colors.warning}20` }}>
            <Activity size={24} color={colors.warning} />
          </div>
          <div style={styles.statValue}>{stats.totalActiveTasks}</div>
          <div style={styles.statLabel}>Active Tasks</div>
          <div style={{ ...styles.statTrend, color: colors.warning }}>
            <PlayCircle size={14} />
            {stats.totalPendingTasks} Pending
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: `${colors.success}20` }}>
            <CheckCircle2 size={24} color={colors.success} />
          </div>
          <div style={styles.statValue}>{stats.totalCompletedTasks}</div>
          <div style={styles.statLabel}>Completed Tasks</div>
          <div style={{ ...styles.statTrend, color: colors.success }}>
            <ArrowUpRight size={14} />
            {stats.completed} Apps Done
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: `${colors.purple}20` }}>
            <Users size={24} color={colors.purple} />
          </div>
          <div style={styles.statValue}>{stats.activeSpecialists}</div>
          <div style={styles.statLabel}>Active Specialists</div>
          <div style={{ ...styles.statTrend, color: colors.purple }}>
            <Shield size={14} />
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
              <Briefcase size={18} color={colors.primary} />
              Workload Distribution
            </div>
            {stats.unassignedTasks > 0 && (
              <span style={{
                ...styles.badge,
                background: `${colors.warning}20`,
                color: colors.warning,
              }}>
                <AlertCircle size={12} />
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
                      <Layers size={12} />
                      {specialty.replace('_', ' ')}
                    </div>
                    <div style={styles.workloadStats}>
                      <div style={styles.workloadStat}>
                        <Clock size={14} color={colors.primary} />
                        <span style={{ ...styles.workloadNumber, color: colors.primary }}>{data.pending}</span>
                        <span style={styles.workloadMini}>pending</span>
                      </div>
                      <div style={styles.workloadStat}>
                        <Activity size={14} color={colors.warning} />
                        <span style={{ ...styles.workloadNumber, color: colors.warning }}>{data.in_progress}</span>
                        <span style={styles.workloadMini}>active</span>
                      </div>
                      <div style={styles.workloadStat}>
                        <CheckCircle size={14} color={colors.success} />
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
              <GitBranch size={18} color={colors.cyan} />
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
            <PipelineVisual pipelineData={pipelineData} isDark={isDark} colors={colors} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ ...styles.card, marginBottom: '24px' }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>
            <Plus size={18} color={colors.success} />
            Quick Actions
          </div>
        </div>
        <div style={{ ...styles.cardBody, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={onAddSpecialist}
            style={{
              ...styles.actionButton,
              background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
            }}
          >
            <Plus size={18} />
            Add Specialist
          </button>
        </div>
      </div>

      {/* Specialists Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>
            <Users size={18} color={colors.purple} />
            Specialists ({filteredSpecialists.length})
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={styles.searchBox}>
              <Search size={16} color={isDark ? '#64748b' : '#94a3b8'} />
              <input
                type="text"
                placeholder="Search specialists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Specialist</th>
                <th style={styles.tableHeader}>Username</th>
                <th style={styles.tableHeader}>Specialty</th>
                <th style={styles.tableHeader}>Role</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Workload</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecialists.map((specialist) => (
                <tr key={specialist.id} style={styles.tableRow}>
                  <td style={{ ...styles.tableCell, borderRadius: '12px 0 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.chaseBlue} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px',
                      }}>
                        {specialist.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                          {specialist.full_name}
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
                          {specialist.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <code style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      fontSize: '13px',
                    }}>
                      {specialist.username}
                    </code>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: `${colors.primary}15`,
                      color: colors.primary,
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {specialist.specialty_type?.replace('_', ' ') || 'Not Assigned'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: specialist.role === 'admin' ? `${colors.purple}15` : `${colors.cyan}15`,
                      color: specialist.role === 'admin' ? colors.purple : colors.cyan,
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}>
                      {specialist.role}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {specialist.is_active ? (
                        <>
                          <UserCheck size={16} color={colors.success} />
                          <span style={{ color: colors.success, fontWeight: '500' }}>Active</span>
                        </>
                      ) : (
                        <>
                          <UserX size={16} color={colors.danger} />
                          <span style={{ color: colors.danger, fontWeight: '500' }}>Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: `${colors.warning}15`,
                        color: colors.warning,
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {specialist.pending_tasks_count || 0} pending
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: `${colors.primary}15`,
                        color: colors.primary,
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {specialist.in_progress_tasks_count || 0} active
                      </span>
                    </div>
                  </td>
                  <td style={{ ...styles.tableCell, borderRadius: '0 12px 12px 0' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onEditSpecialist(specialist)}
                        style={styles.iconButton}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteSpecialist(specialist)}
                        style={{ ...styles.iconButton, color: colors.danger }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Pipeline Visual Subcomponent
const PipelineVisual = ({ pipelineData, isDark, colors }) => {
  return (
    <div style={{ position: 'relative', padding: '20px 0' }}>
      {/* Main Cylindrical Pipe */}
      <div style={{
        position: 'relative',
        marginLeft: '30px',
        marginRight: '10px',
        height: '90px',
        borderRadius: '45px',
        background: isDark
          ? `linear-gradient(180deg, #93c5fd 0%, #60a5fa 10%, #3b82f6 20%, #2563eb 35%, #1d4ed8 50%, #1e40af 65%, #2563eb 80%, #3b82f6 100%)`
          : `linear-gradient(180deg, #93c5fd 0%, #60a5fa 10%, #3b82f6 20%, #2563eb 35%, #1d4ed8 50%, #1e40af 65%, #1e3a8a 80%, #172554 100%)`,
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
            ? `linear-gradient(180deg, #1e3a5f 0%, #234876 30%, #2a5690 50%, #234876 70%, #1e3a5f 100%)`
            : `linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 30%, #ffffff 50%, #f1f5f9 70%, #e2e8f0 100%)`,
          boxShadow: isDark
            ? 'inset 0 4px 15px rgba(0,0,0,0.4)'
            : 'inset 0 4px 15px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 30px',
        }}>
          {/* Stage Circles */}
          {pipelineData.map((stage, idx) => {
            const hasApplications = stage.count > 0;
            return (
              <React.Fragment key={stage.name}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: hasApplications
                      ? `radial-gradient(circle at 30% 30%, ${stage.color} 0%, ${adjustColor(stage.color, -30)} 100%)`
                      : isDark
                        ? 'radial-gradient(circle at 30% 30%, #475569 0%, #334155 100%)'
                        : 'radial-gradient(circle at 30% 30%, #cbd5e1 0%, #94a3b8 100%)',
                    boxShadow: hasApplications
                      ? `0 4px 15px ${stage.color}60, inset 0 2px 4px rgba(255,255,255,0.3)`
                      : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: hasApplications ? `2px solid ${stage.color}` : 'none',
                    transition: 'all 0.3s',
                  }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '800',
                      color: hasApplications ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
                      textShadow: hasApplications ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                    }}>
                      {stage.count}
                    </span>
                  </div>
                </div>
                {idx < pipelineData.length - 1 && (
                  <div style={{
                    width: '2px',
                    height: '40px',
                    background: isDark
                      ? 'linear-gradient(180deg, rgba(100,116,139,0.3) 0%, rgba(100,116,139,0.6) 50%, rgba(100,116,139,0.3) 100%)'
                      : 'linear-gradient(180deg, rgba(148,163,184,0.3) 0%, rgba(148,163,184,0.6) 50%, rgba(148,163,184,0.3) 100%)',
                    borderRadius: '1px',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Left End Cap */}
        <div style={{
          position: 'absolute',
          left: '-30px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '60px',
          height: '90px',
          borderRadius: '50%',
          background: isDark
            ? `linear-gradient(90deg, #1e40af 0%, #2563eb 30%, #3b82f6 60%, #60a5fa 100%)`
            : `linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 30%, #2563eb 60%, #3b82f6 100%)`,
          boxShadow: isDark
            ? '0 0 20px rgba(59,130,246,0.4), inset 2px 0 8px rgba(255,255,255,0.1)'
            : '0 0 20px rgba(30,64,175,0.3), inset 2px 0 8px rgba(255,255,255,0.2)',
        }}>
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '30px',
            height: '50px',
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(ellipse at 40% 50%, #0f172a 0%, #1e293b 100%)'
              : 'radial-gradient(ellipse at 40% 50%, #334155 0%, #475569 100%)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
          }} />
        </div>
      </div>

      {/* Stage Labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '16px',
        paddingLeft: '60px',
        paddingRight: '10px',
      }}>
        {pipelineData.map((stage, idx) => (
          <React.Fragment key={`label-${stage.name}`}>
            <div style={{
              textAlign: 'center',
              minWidth: '60px',
            }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: stage.count > 0 ? stage.color : (isDark ? '#64748b' : '#94a3b8'),
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                {stage.short}
              </div>
            </div>
            {idx < pipelineData.length - 1 && <div style={{ width: '2px' }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Helper function to adjust color brightness
const adjustColor = (color, amount) => {
  const clamp = (val) => Math.min(255, Math.max(0, val));
  const hex = color.replace('#', '');
  const r = clamp(parseInt(hex.substr(0, 2), 16) + amount);
  const g = clamp(parseInt(hex.substr(2, 2), 16) + amount);
  const b = clamp(parseInt(hex.substr(4, 2), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export default OverviewTab;
