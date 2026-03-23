/**
 * Workflow Configuration Tab Component for Admin Dashboard
 * Manages workflow tasks, subtasks, and checklists
 */
import React from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Clock,
  CheckCircle,
  UserCheck,
  Workflow,
} from 'lucide-react';
import { COLORS } from './adminStyles';

const WorkflowConfigTab = ({
  workflowTasks,
  loadingWorkflow,
  expandedTasks,
  setExpandedTasks,
  expandedSubtasks,
  setExpandedSubtasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAddSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onAddChecklist,
  onEditChecklist,
  onDeleteChecklist,
  onRefresh,
  isDark,
  styles,
}) => {
  const colors = COLORS;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <Workflow size={18} color={colors.chaseBlue} />
          Workflow Configuration
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onRefresh}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              background: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Refresh"
          >
            <RefreshCw size={16} style={loadingWorkflow ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button
            onClick={onAddTask}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0a4b94 0%, #117ACA 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(10, 75, 148, 0.3)',
            }}
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {loadingWorkflow ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            color: isDark ? '#64748b' : '#94a3b8',
          }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '12px' }} />
            Loading workflow configuration...
          </div>
        ) : workflowTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: isDark ? '#64748b' : '#94a3b8',
          }}>
            <Workflow size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              No Workflow Tasks Defined
            </div>
            <div style={{ fontSize: '13px' }}>
              Click "Add Task" to create your first workflow task
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workflowTasks.map((task, taskIndex) => (
              <TaskCard
                key={task.id}
                task={task}
                taskIndex={taskIndex}
                isExpanded={expandedTasks[task.id]}
                onToggle={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                expandedSubtasks={expandedSubtasks}
                setExpandedSubtasks={setExpandedSubtasks}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onAddSubtask={onAddSubtask}
                onEditSubtask={onEditSubtask}
                onDeleteSubtask={onDeleteSubtask}
                onAddChecklist={onAddChecklist}
                onEditChecklist={onEditChecklist}
                onDeleteChecklist={onDeleteChecklist}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({
  task,
  taskIndex,
  isExpanded,
  onToggle,
  expandedSubtasks,
  setExpandedSubtasks,
  onEditTask,
  onDeleteTask,
  onAddSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onAddChecklist,
  onEditChecklist,
  onDeleteChecklist,
  isDark,
  colors,
}) => {
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Task Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderLeft: `4px solid ${task.color || '#0a4b94'}`,
          cursor: 'pointer',
          background: isExpanded
            ? (isDark ? 'rgba(10, 75, 148, 0.1)' : 'rgba(10, 75, 148, 0.05)')
            : 'transparent',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <GripVertical size={16} style={{ opacity: 0.3, cursor: 'grab' }} />
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: task.color || '#0a4b94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '700',
              fontSize: '14px',
            }}
          >
            {taskIndex + 1}
          </div>
          <div>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}>
              {task.name}
            </div>
            <div style={{
              fontSize: '12px',
              color: isDark ? '#64748b' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}>
                {task.phase_code}
              </span>
              <span>•</span>
              <span>{task.subtasks?.length || 0} subtasks</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(task);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
              color: colors.chaseBlue,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Edit Task"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
              background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Delete Task"
          >
            <Trash2 size={14} />
          </button>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Content - Subtasks */}
      {isExpanded && (
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: isDark ? '#94a3b8' : '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Subtasks ({task.subtasks?.length || 0})
            </span>
            <button
              onClick={() => onAddSubtask(task)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: `${colors.chaseBlue}15`,
                color: colors.chaseBlue,
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Add Subtask
            </button>
          </div>

          {/* Subtasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(task.subtasks || []).map((subtask, subtaskIndex) => (
              <SubtaskCard
                key={subtask.id}
                subtask={subtask}
                subtaskIndex={subtaskIndex}
                taskIndex={taskIndex}
                isExpanded={expandedSubtasks[subtask.id]}
                onToggle={() => setExpandedSubtasks(prev => ({ ...prev, [subtask.id]: !prev[subtask.id] }))}
                onEditSubtask={onEditSubtask}
                onDeleteSubtask={onDeleteSubtask}
                onAddChecklist={onAddChecklist}
                onEditChecklist={onEditChecklist}
                onDeleteChecklist={onDeleteChecklist}
                task={task}
                isDark={isDark}
                colors={colors}
              />
            ))}
            {(!task.subtasks || task.subtasks.length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: isDark ? '#475569' : '#94a3b8',
                fontSize: '12px',
              }}>
                No subtasks defined. Click "Add Subtask" to create one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Subtask Card Component
const SubtaskCard = ({
  subtask,
  subtaskIndex,
  taskIndex,
  isExpanded,
  onToggle,
  onEditSubtask,
  onDeleteSubtask,
  onAddChecklist,
  onEditChecklist,
  onDeleteChecklist,
  task,
  isDark,
  colors,
}) => {
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: colors.chaseBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '600',
            fontSize: '11px',
          }}>
            {taskIndex + 1}.{subtaskIndex + 1}
          </div>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: '500',
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}>
              {subtask.name}
            </div>
            <div style={{
              fontSize: '11px',
              color: isDark ? '#64748b' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {subtask.default_specialist && (
                <>
                  <UserCheck size={12} />
                  <span>{subtask.default_specialist.full_name}</span>
                  <span>•</span>
                </>
              )}
              <span>{subtask.checklist_items?.length || 0} checklist items</span>
              <span>•</span>
              <span>{subtask.estimated_duration} min</span>
              {subtask.sla_hours && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)',
                  border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.3)'}`,
                  color: '#f97316',
                  fontWeight: 600,
                  fontSize: '10px',
                  marginLeft: '4px',
                }}>
                  <Clock size={10} />
                  SLA: {subtask.sla_hours}h
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditSubtask(subtask, task);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              background: 'transparent',
              color: colors.chaseBlue,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Edit Subtask"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSubtask(subtask);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Delete Subtask"
          >
            <Trash2 size={12} />
          </button>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Checklist Items */}
      {isExpanded && (
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
          background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.01)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: isDark ? '#64748b' : '#94a3b8',
              textTransform: 'uppercase',
            }}>
              Checklist ({subtask.checklist_items?.length || 0})
            </span>
            <button
              onClick={() => onAddChecklist(subtask)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: `${colors.success}15`,
                color: colors.success,
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              Add Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(subtask.checklist_items || []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}
              >
                <CheckCircle size={14} color={colors.success} style={{ opacity: 0.5 }} />
                <span style={{
                  flex: 1,
                  fontSize: '12px',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                }}>
                  {item.name}
                </span>
                {item.activity_category && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    color: isDark ? '#64748b' : '#94a3b8',
                  }}>
                    {item.activity_category}
                  </span>
                )}
                <button
                  onClick={() => onEditChecklist(item, subtask)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: colors.chaseBlue,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit2 size={11} />
                </button>
                <button
                  onClick={() => onDeleteChecklist(item)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {(!subtask.checklist_items || subtask.checklist_items.length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                color: isDark ? '#475569' : '#94a3b8',
                fontSize: '11px',
              }}>
                No checklist items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowConfigTab;
