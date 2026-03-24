/**
 * Workflow Configuration Tab Component for Admin Dashboard
 * Manages workflow tasks, subtasks, and checklists
 */
import React, { useState, useRef } from 'react';
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
  LuSparkles,
} from 'react-icons/lu';
import { COLORS } from './adminStyles';
import { reorderWorkflowTasks } from '../../services/api';

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

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'above' or 'below'
  const dragCounter = useRef(0);

  // Check if task is new (created within last 5 minutes)
  const isNewTask = (task) => {
    if (!task.created_at) return false;
    const createdAt = new Date(task.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / (1000 * 60);
    return diffMinutes < 5;
  };

  // Handle drag start
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId.toString());
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDropPosition(null);
    dragCounter.current = 0;
  };

  // Handle drag over
  const handleDragOver = (e, taskId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (taskId === draggedTaskId) return;

    // Calculate if drop should be above or below
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';

    setDragOverTaskId(taskId);
    setDropPosition(position);
  };

  // Handle drag enter
  const handleDragEnter = (e, taskId) => {
    e.preventDefault();
    dragCounter.current++;
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverTaskId(null);
      setDropPosition(null);
    }
  };

  // Handle drop
  const handleDrop = async (e, targetTaskId) => {
    e.preventDefault();

    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDropPosition(null);
      return;
    }

    // Calculate new order
    const currentTasks = [...workflowTasks];
    const draggedIndex = currentTasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = currentTasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged task
    const [draggedTask] = currentTasks.splice(draggedIndex, 1);

    // Calculate new position
    let newIndex = targetIndex;
    if (dropPosition === 'below') {
      newIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      newIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    // Insert at new position
    currentTasks.splice(newIndex, 0, draggedTask);

    // Create order updates
    const taskOrders = currentTasks.map((task, index) => ({
      id: task.id,
      order_index: index
    }));

    try {
      await reorderWorkflowTasks(taskOrders);
      await fetchWorkflowTasks();
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDropPosition(null);
  };

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
            {workflowTasks.map((task, taskIndex) => {
              const taskIsNew = isNewTask(task);
              const isDragging = draggedTaskId === task.id;
              const isDragOver = dragOverTaskId === task.id;

              return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragEnter={(e) => handleDragEnter(e, task.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id)}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDragOver ? colors.chaseBlue : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  opacity: isDragging ? 0.5 : 1,
                  transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Drop indicator line */}
                {isDragOver && dropPosition === 'above' && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: colors.chaseBlue,
                    borderRadius: '2px',
                    zIndex: 10,
                  }} />
                )}
                {isDragOver && dropPosition === 'below' && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: colors.chaseBlue,
                    borderRadius: '2px',
                    zIndex: 10,
                  }} />
                )}
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
                    <LuGripVertical
                      size={16}
                      style={{
                        opacity: 0.5,
                        cursor: 'grab',
                        color: isDark ? '#94a3b8' : '#64748b',
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {task.name}
                        {taskIsNew && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                            animation: 'pulse 2s infinite',
                          }}>
                            <LuSparkles size={10} />
                            NEW
                          </span>
                        )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowConfigTab;
