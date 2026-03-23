/**
 * Workflow Configuration Tab Component for Admin Dashboard
 * Manages workflow tasks, subtasks, and checklists
 */
import React from 'react';
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuRefreshCw,
  LuChevronDown,
  LuChevronUp,
  LuGripVertical,
  LuClock,
  LuCircleCheckBig,
  LuUserCheck,
  LuWorkflow,
} from 'react-icons/lu';
import { COLORS } from './adminStyles';

const WorkflowConfigTab = ({
  workflowTasks,
  loadingWorkflow,
  expandedTasks,
  setExpandedTasks,
  expandedSubtasks,
  setExpandedSubtasks,
  setWorkflowModal,
  setWorkflowModalData,
  setWorkflowFormData,
  setWorkflowError,
  setEditingTask,
  setEditingSubtask,
  setEditingChecklist,
  fetchWorkflowTasks,
  showDeleteConfirm,
  deleteWorkflowTask,
  deleteSubtask,
  deleteChecklistItem,
  isDark,
  styles,
}) => {
  const colors = COLORS;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <LuWorkflow size={18} color={colors.chaseBlue} />
          Workflow Configuration
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchWorkflowTasks}
            style={styles.iconBtn}
            title="Refresh"
          >
            <LuRefreshCw size={16} style={loadingWorkflow ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button
            onClick={() => {
              setWorkflowModal('task');
              setWorkflowModalData(null);
              setWorkflowFormData({
                name: '',
                description: '',
                phase_code: '',
                color: '#0a4b94',
              });
              setWorkflowError('');
            }}
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
            <LuPlus size={16} />
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
            <LuRefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '12px' }} />
            Loading workflow configuration...
          </div>
        ) : workflowTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: isDark ? '#64748b' : '#94a3b8',
          }}>
            <LuWorkflow size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
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
              <div
                key={task.id}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Task Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderLeft: `4px solid ${task.color || '#0a4b94'}`,
                    cursor: 'pointer',
                    background: expandedTasks[task.id]
                      ? (isDark ? 'rgba(10, 75, 148, 0.1)' : 'rgba(10, 75, 148, 0.05)')
                      : 'transparent',
                  }}
                  onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <LuGripVertical size={16} style={{ opacity: 0.3, cursor: 'grab' }} />
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: task.color || '#0a4b94',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      {taskIndex + 1}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '14px',
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
                        setEditingTask(task);
                        setWorkflowModal('task');
                        setWorkflowFormData({
                          name: task.name,
                          description: task.description || '',
                          phase_code: task.phase_code,
                          color: task.color || '#0a4b94',
                        });
                        setWorkflowError('');
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
                      <LuPencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showDeleteConfirm('task', task, task.name, async () => {
                          await deleteWorkflowTask(task.id);
                          await fetchWorkflowTasks();
                        });
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
                      <LuTrash2 size={14} />
                    </button>
                    {expandedTasks[task.id] ? <LuChevronUp size={18} /> : <LuChevronDown size={18} />}
                  </div>
                </div>

                {/* Subtasks */}
                {expandedTasks[task.id] && (
                  <div style={{
                    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                    padding: '16px 20px 16px 52px',
                    background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isDark ? '#64748b' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Subtasks
                      </div>
                      <button
                        onClick={() => {
                          setWorkflowModal('subtask');
                          setWorkflowModalData({ taskId: task.id, taskName: task.name });
                          setWorkflowFormData({
                            name: '',
                            description: '',
                            default_specialist_id: null,
                            estimated_duration: 30,
                            sla_hours: null,
                            is_required: true,
                          });
                          setWorkflowError('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <LuPlus size={14} />
                        Add Subtask
                      </button>
                    </div>

                    {task.subtasks?.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: isDark ? '#4a5568' : '#a0aec0',
                        fontSize: '13px',
                      }}>
                        No subtasks defined. Click "Add Subtask" to create one.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.subtasks?.map((subtask, subtaskIndex) => (
                          <div
                            key={subtask.id}
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                              borderRadius: '8px',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Subtask Header */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: expandedSubtasks[subtask.id]
                                  ? (isDark ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.03)')
                                  : 'transparent',
                              }}
                              onClick={() => setExpandedSubtasks(prev => ({ ...prev, [subtask.id]: !prev[subtask.id] }))}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <LuGripVertical size={14} style={{ opacity: 0.3, cursor: 'grab' }} />
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: colors.purple,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: '600',
                                    fontSize: '11px',
                                  }}
                                >
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
                                        <LuUserCheck size={12} />
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
                                        <LuClock size={10} />
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
                                    setEditingSubtask(subtask);
                                    setWorkflowModal('subtask');
                                    setWorkflowModalData({ taskId: task.id, taskName: task.name });
                                    setWorkflowFormData({
                                      name: subtask.name,
                                      description: subtask.description || '',
                                      default_specialist_id: subtask.default_specialist_id || null,
                                      estimated_duration: subtask.estimated_duration || 30,
                                      sla_hours: subtask.sla_hours || null,
                                      is_required: subtask.is_required !== false,
                                    });
                                    setWorkflowError('');
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
                                  <LuPencil size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showDeleteConfirm('subtask', subtask, subtask.name, async () => {
                                      await deleteSubtask(subtask.id);
                                      await fetchWorkflowTasks();
                                    });
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
                                  <LuTrash2 size={12} />
                                </button>
                                {expandedSubtasks[subtask.id] ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
                              </div>
                            </div>

                            {/* Checklist Items */}
                            {expandedSubtasks[subtask.id] && (
                              <div style={{
                                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
                                padding: '12px 16px 12px 40px',
                                background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.01)',
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '10px',
                                }}>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: isDark ? '#4a5568' : '#a0aec0',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}>
                                    Checklist Items
                                  </div>
                                  <button
                                    onClick={() => {
                                      setWorkflowModal('checklist');
                                      setWorkflowModalData({ subtaskId: subtask.id, subtaskName: subtask.name });
                                      setWorkflowFormData({
                                        name: '',
                                        description: '',
                                        activity_category: '',
                                        is_required: true,
                                      });
                                      setWorkflowError('');
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '5px',
                                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                      background: 'transparent',
                                      color: isDark ? '#94a3b8' : '#64748b',
                                      fontSize: '11px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <LuPlus size={12} />
                                    Add Item
                                  </button>
                                </div>

                                {subtask.checklist_items?.length === 0 ? (
                                  <div style={{
                                    textAlign: 'center',
                                    padding: '16px',
                                    color: isDark ? '#4a5568' : '#cbd5e1',
                                    fontSize: '12px',
                                  }}>
                                    No checklist items
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {subtask.checklist_items?.map((item, itemIndex) => (
                                      <div
                                        key={item.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          padding: '8px 12px',
                                          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
                                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
                                          borderRadius: '6px',
                                          gap: '10px',
                                        }}
                                      >
                                        <div style={{
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '4px',
                                          border: `2px solid ${colors.success}`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}>
                                          <LuCircleCheckBig size={10} color={colors.success} style={{ opacity: 0.3 }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            color: isDark ? '#e2e8f0' : '#1e293b',
                                          }}>
                                            {item.name}
                                          </div>
                                          {item.activity_category && (
                                            <div style={{
                                              fontSize: '10px',
                                              color: isDark ? '#4a5568' : '#a0aec0',
                                              marginTop: '2px',
                                            }}>
                                              {item.activity_category}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => {
                                            setEditingChecklist(item);
                                            setWorkflowModal('checklist');
                                            setWorkflowModalData({ subtaskId: subtask.id, subtaskName: subtask.name });
                                            setWorkflowFormData({
                                              name: item.name,
                                              description: item.description || '',
                                              activity_category: item.activity_category || '',
                                              is_required: item.is_required !== false,
                                            });
                                            setWorkflowError('');
                                          }}
                                          style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: isDark ? '#64748b' : '#94a3b8',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                          title="Edit Item"
                                        >
                                          <LuPencil size={11} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            showDeleteConfirm('checklist', item, item.name, async () => {
                                              await deleteChecklistItem(item.id);
                                              await fetchWorkflowTasks();
                                            });
                                          }}
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
                                          title="Delete Item"
                                        >
                                          <LuTrash2 size={11} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowConfigTab;
