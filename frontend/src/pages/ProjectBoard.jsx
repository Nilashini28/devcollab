import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { format, isPast, isToday } from 'date-fns';
import { Avatar } from '../components/Layout';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#64748b' },
  { id: 'inprogress', label: 'In Progress', color: '#f59e0b', wipLimit: 5 },
  { id: 'inreview', label: 'In Review', color: '#3b82f6' },
  { id: 'done', label: 'Done', color: '#10b981' },
];

function TaskCard({ task, onClick, isDragging, remoteDragging, taskViewers }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const completedSubs = task.subTasks?.filter(s => s.completed).length || 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`task-card ${overdue ? 'overdue' : ''} ${remoteDragging ? 'remote-dragging' : ''}`}
      onClick={() => onClick(task)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{task.title}</div>
        <span className={`badge badge-${task.priority}`} title={`Priority ${task.priority}`} style={{ flexShrink: 0 }}>{task.priority}</span>
      </div>
      {task.labels?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {task.labels.slice(0, 3).map(l => <span key={l} className="label-chip">{l}</span>)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.assigneeId && <Avatar user={task.assigneeId} size="avatar-sm" />}
          {task.subTasks?.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>✓ {completedSubs}/{task.subTasks.length}</span>
          )}
        </div>
        {task.dueDate && (
          <span style={{ fontSize: 11, color: overdue ? 'var(--danger)' : isToday(new Date(task.dueDate)) ? 'var(--warning)' : 'var(--text-3)', fontWeight: overdue ? 600 : 400 }}>
            {overdue ? '⚠ ' : ''}{format(new Date(task.dueDate), 'MMM d')}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Created {format(new Date(task.createdAt || Date.now()), 'MMM d')}</span>
        )}
            </div>
      {remoteDragging && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--primary-light)', boxShadow: 'var(--shadow-sm)' }}>
            Being moved by {remoteDragging}...
          </div>
        </div>
      )}
      {taskViewers && taskViewers.length > 0 && (
        <div style={{ position: 'absolute', top: -10, right: -10, background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, boxShadow: 'var(--shadow-sm)', zIndex: 10, animation: 'fadeIn 0.2s ease-out' }}>
          👁 {taskViewers[0]} {taskViewers.length > 1 ? `+${taskViewers.length-1}` : ''} viewing
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ column, tasks, onTaskClick, activeId, remoteDraggingState = {}, taskViewersState = {} }) {
  const { setNodeRef } = useSortable({ id: column.id });
  const wip = column.wipLimit && tasks.length >= column.wipLimit;

  return (
    <div ref={setNodeRef} className="kanban-col">
      <div className="kanban-col-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: column.color }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{column.label}</span>
          <span style={{ background: 'var(--border)', color: 'var(--text-2)', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{tasks.length}</span>
        </div>
        {wip && <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600, background: 'var(--warning-light)', padding: '2px 6px', borderRadius: 4 }}>WIP limit</span>}
      </div>
      <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onClick={onTaskClick} isDragging={activeId === task._id} remoteDragging={remoteDraggingState[task._id]} taskViewers={taskViewersState[task._id]} />
        ))}
      </SortableContext>
      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-3)', fontSize: 13, border: '2px dashed var(--border)', borderRadius: 8, margin: '4px 0' }}>
          Drop tasks here
        </div>
      )}
    </div>
  );
}

function TaskModal({ task, project, members, onClose, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...task });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiLinks, setAiLinks] = useState([]);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [generatingCommit, setGeneratingCommit] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [typing, setTyping] = useState(null);

  const loadComments = useCallback(async () => {
    const r = await api.get(`/tasks/${task._id}/comments`);
    setComments(r.data);
  }, [task._id]);

  const suggestLinks = useCallback(async () => {
    try {
      const r = await api.post('/ai/suggest-links', {
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        currentTaskId: task._id
      });
      setAiLinks(r.data.suggestions || []);
    } catch {
      // ignore
    }
  }, [task.title, task.description, task.projectId, task._id]);

  useEffect(() => {
    const s = getSocket();

    // schedule async updates so React effects don't synchronously trigger setState
    Promise.resolve().then(() => {
      loadComments();
      suggestLinks();
    });

    s.emit('task:viewing', {
      projectId: task.projectId,
      taskId: task._id,
      userId: user._id,
      userName: user.name
    });

    s.on('task:viewing', ({ taskId, userName }) => {
      if (taskId === task._id) setViewers(v => [...new Set([...v, userName])]);
    });

    s.on('comment:typing', ({ taskId, userName }) => {
      if (taskId === task._id && userName !== user.name) {
        setTyping(userName);
        setTimeout(() => setTyping(null), 2000);
      }
    });

    s.on('comment:new', c => {
      if (c.taskId === task._id) setComments(prev => [...prev, c]);
    });

    return () => {
      s.off('task:viewing');
      s.off('comment:typing');
      s.off('comment:new');
    };
  }, [loadComments, suggestLinks, task._id, task.projectId, user._id, user.name]);


  async function saveField(field, value) {
    try {
      const updated = await api.put(`/tasks/${task._id}`, { [field]: value });
      onUpdate(updated.data);
    } catch { toast.error('Failed to update'); }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tasks/${task._id}/comments`, { body: commentText });
      setCommentText('');
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  }

  async function generateCommit() {
    setGeneratingCommit(true);
    try {
      const r = await api.post('/ai/commit-message', { task: { title: form.title, description: form.description } });
      await navigator.clipboard.writeText(r.data.message);
      toast.success('Commit message copied!');
    } catch { toast.error('Failed to generate commit'); }
    finally { setGeneratingCommit(false); }
  }

  async function generateBreakdown() {
    setBreakdownLoading(true);
    setShowAiBreakdown(true);
    try {
      const r = await api.post('/ai/task-breakdown', { description: form.description || form.title, projectId: project._id, techStack: project.techStack, members: members.map(m => ({ name: m.userId?.name || m.name, skills: m.userId?.skills || [] })) });
      setBreakdown(r.data);
    } catch { toast.error('AI unavailable'); } finally { setBreakdownLoading(false); }
  }

  async function acceptSubtask(t) {
    const newSub = { title: t.title, completed: false };
    const updated = await api.put(`/tasks/${task._id}`, { subTasks: [...(form.subTasks || []), newSub] });
    setForm(updated.data);
    onUpdate(updated.data);
    toast.success('Subtask added');
  }

  const daysInColumn = useMemo(() => {
    const now = new Date();
    return task.columnEnteredAt
      ? Math.floor((now.getTime() - new Date(task.columnEnteredAt).getTime()) / 86400000)
      : 0;
  }, [task.columnEnteredAt]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} onBlur={e => saveField('title', e.target.value)}
              style={{ fontSize: 18, fontWeight: 700, border: 'none', padding: 0, background: 'transparent', width: '100%' }} placeholder="Task title" />
            {viewers.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>👁 {viewers.slice(0,2).join(', ')} viewing</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { if (confirm('Delete this task?')) { onDelete(task._id); onClose(); } }} className="btn btn-sm" style={{ color: 'var(--danger)' }}>🗑</button>
            <button onClick={onClose} style={{ color: 'var(--text-2)', fontSize: 18, padding: 4 }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', maxHeight: '75vh', overflow: 'hidden' }}>
          {/* Main */}
          <div style={{ padding: 24, overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} onBlur={e => saveField('description', e.target.value)}
                style={{ marginTop: 6, resize: 'vertical', minHeight: 80 }} placeholder="Add a description..." />
            </div>

            {/* Subtasks */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Subtasks {form.subTasks?.length > 0 && `(${form.subTasks.filter(s=>s.completed).length}/${form.subTasks.length})`}
                </label>
                <button onClick={generateBreakdown} className="btn btn-sm" style={{ fontSize: 11 }}>🤖 AI breakdown</button>
              </div>
              {form.subTasks?.map((sub, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={sub.completed} onChange={async () => {
                    const updated = form.subTasks.map((s, j) => j === i ? { ...s, completed: !s.completed } : s);
                    setForm(p => ({ ...p, subTasks: updated }));
                    await api.put(`/tasks/${task._id}`, { subTasks: updated });
                    getSocket().emit('task:updated', { ...task, subTasks: updated });
                  }} style={{ width: 'auto' }} />
                  <span style={{ fontSize: 13, textDecoration: sub.completed ? 'line-through' : 'none', color: sub.completed ? 'var(--text-3)' : 'var(--text-1)' }}>{sub.title}</span>
                </div>
              ))}
              {form.subTasks?.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No subtasks yet</div>}
            </div>

            {showAiBreakdown && (
              <div style={{ marginBottom: 20, background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>🤖 AI Task Breakdown</span>
    {breakdown?.tasks?.length > 0 && (
      <button onClick={async () => {
        try {
          await api.post('/tasks/bulk', { projectId: project._id, tasks: breakdown.tasks });
          toast.success(`${breakdown.tasks.length} tasks created on board`);
          setBreakdown({ tasks: [] });
          setShowAiBreakdown(false);
        } catch { toast.error('Failed to create tasks'); }
      }} className="btn btn-sm btn-primary">Create All on Board</button>
    )}
  </div>
                {breakdownLoading ? <div style={{ color: 'var(--text-2)' }}>Generating...</div> : breakdown?.tasks?.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      <span style={{ marginLeft: 8, fontSize: 13 }}>{t.title}</span>
                      {t.isDuplicate && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--warning)' }}>⚠ duplicate</span>}
                    </div>
                    <button onClick={() => {
    setBreakdown(p => ({...p, tasks: p.tasks.filter((_, idx) => idx !== i)}));
  }} className="btn btn-sm" style={{color: 'var(--danger)', marginRight: 6}}>✕</button>
  <button onClick={() => acceptSubtask(t)} className="btn btn-sm btn-primary" disabled={t.isDuplicate}>+ Add to Task</button>
                  </div>
                ))}
                <button onClick={() => setShowAiBreakdown(false)} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Close</button>
              </div>
            )}

            {/* AI Linked tasks */}
            {aiLinks.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔗 AI Suggested Links</label>
                {aiLinks.map(link => (
                  <div key={link.taskId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginTop: 4, background: 'var(--surface-3)', borderRadius: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{link.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{link.reason}</div>
                    </div>
                    <button onClick={async () => {
                      await api.put(`/tasks/${task._id}`, { linkedTaskIds: [...(form.linkedTaskIds || []), link.taskId] });
                      setAiLinks(p => p.filter(l => l.taskId !== link.taskId));
                      toast.success('Task linked');
                    }} className="btn btn-sm btn-secondary">Link</button>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {task.history?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activity log</label>
                {task.history.slice(-5).reverse().map((h, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 500 }}>{h.field}</span> changed from <code>{h.from || '—'}</code> to <code>{h.to}</code> · {new Date(h.timestamp).toLocaleDateString()}
                  </div>
                ))}
              </div>
            )}

            {/* Comments */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comments</label>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(c => (
                  <div key={c._id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar user={c.authorId} size="avatar-sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{c.authorId?.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 13, background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 8 }}>{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              {typing && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{typing} is typing...</div>}
              <form onSubmit={addComment} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input value={commentText} onChange={e => { setCommentText(e.target.value); getSocket().emit('comment:typing', { projectId: task.projectId, taskId: task._id, userId: user._id, userName: user.name }); }}
                  placeholder="Add a comment..." style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>Post</button>
              </form>
            </div>
          </div>

          {/* Sidebar fields */}
          <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Status</label>
              <select value={form.status} onChange={e => { setForm(p => ({ ...p, status: e.target.value })); saveField('status', e.target.value); }}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Priority</label>
              <select value={form.priority} onChange={e => { setForm(p => ({ ...p, priority: e.target.value })); saveField('priority', e.target.value); }}>
                <option value="P0">P0 — Critical</option>
                <option value="P1">P1 — High</option>
                <option value="P2">P2 — Normal</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Assignee</label>
              <select value={form.assigneeId?._id || form.assigneeId || ''} onChange={e => { setForm(p => ({ ...p, assigneeId: e.target.value })); saveField('assigneeId', e.target.value); }}>
                <option value="">Unassigned</option>
                {members.map(m => m.userId && <option key={m.userId._id} value={m.userId._id}>{m.userId.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Due date</label>
              <input type="date" value={form.dueDate ? form.dueDate.split('T')[0] : ''} onChange={e => { setForm(p => ({ ...p, dueDate: e.target.value })); saveField('dueDate', e.target.value); }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Labels</label>
              <input value={form.labels?.join(', ') || ''} onChange={e => setForm(p => ({ ...p, labels: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))}
                onBlur={e => saveField('labels', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} placeholder="bug, feature, ux" />
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 10, fontSize: 12, color: 'var(--text-2)' }}>
              <div>⏱ <strong>{daysInColumn}</strong> day{daysInColumn !== 1 ? 's' : ''} in this column</div>
              {task.createdBy && <div style={{ marginTop: 4 }}>Created by {task.createdBy.name}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ projectId, members, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'P2', status: 'todo', labels: '', assigneeId: '' });
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [standup, setStandup] = useState(null);
  const [standupLoading, setStandupLoading] = useState(false);
  const [showStandup, setShowStandup] = useState(false);

  const fetchNameSuggestions = useCallback(async () => {
    try {
      const r = await api.post('/ai/suggest-task-name', { title: form.title });
      setNameSuggestions(r.data.suggestions || []);
    } catch {
      // ignore
    }
  }, [form.title]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.title && form.title.split(' ').length < 5) fetchNameSuggestions();
    }, 800);
    return () => clearTimeout(timer);
  }, [form.title, fetchNameSuggestions]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const labels = form.labels.split(',').map(s => s.trim()).filter(Boolean);
      const r = await api.post('/tasks', { ...form, labels, projectId });
      onCreate(r.data);
      onClose();
      toast.success('Task created!');
    } catch { toast.error('Failed to create task'); }
  }

  async function generateStandup() {
    setStandupLoading(true);
    setShowStandup(true);
    try {
      const r = await api.post('/ai/standup', { projectId });
      setStandup(r.data);
    } catch { toast.error('AI unavailable'); } finally { setStandupLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ padding: 24, maxWidth: 540 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>New Task</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={generateStandup} className="btn btn-secondary btn-sm">📋 Standup</button>
            <button onClick={onClose} style={{ color: 'var(--text-2)' }}>✕</button>
          </div>
        </div>

        {showStandup && (
          <div style={{ marginBottom: 16, background: 'var(--info-light)', border: '1px solid var(--info)', borderRadius: 'var(--radius)', padding: 14, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 AI Standup Report</div>
            {standupLoading ? <div>Generating...</div> : standup && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Yesterday</strong>
                  {standup.yesterday?.map((item, i) => <div key={i} style={{ paddingLeft: 12 }}><em>{item.member}:</em> {item.completed?.join(', ') || 'nothing'}</div>)}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Today</strong>
                  {standup.today?.map((item, i) => <div key={i} style={{ paddingLeft: 12 }}><em>{item.member}:</em> {item.inProgress?.join(', ') || 'nothing'}</div>)}
                </div>
                {standup.blockers?.length > 0 && (
                  <div>
                    <strong style={{ color: 'var(--danger)' }}>⚠ Blockers</strong>
                    {standup.blockers.map((b, i) => <div key={i} style={{ paddingLeft: 12, color: 'var(--danger)' }}>{b.task}: {b.reason}</div>)}
                  </div>
                )}
                {standup.flags?.length > 0 && standup.flags.map((f, i) => <div key={i} style={{ color: 'var(--warning)', fontSize: 12, marginTop: 4 }}>⚑ {f}</div>)}
                {standup.flags?.length > 0 && standup.flags.map((f, i) => <div key={i} style={{ color: 'var(--warning)', fontSize: 12, marginTop: 4 }}>⚑ {f}</div>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {standup && <button type="button" onClick={() => {
                if (!('speechSynthesis' in window)) return toast.error('Text-to-speech not supported');
                window.speechSynthesis.cancel();
                let text = "Here is your Standup Report. ";
                if (standup.yesterday?.length) { text += "Yesterday. "; standup.yesterday.forEach(y => text += `${y.member} completed ${y.completed.join(', ')}. `); }
                if (standup.today?.length) { text += "Today. "; standup.today.forEach(t => text += `${t.member} is working on ${t.inProgress.join(', ')}. `); }
                if (standup.blockers?.length) { text += "Warning, Blockers detected! "; standup.blockers.forEach(b => text += `Task ${b.task} is blocked because ${b.reason}. `); }
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.05;
                window.speechSynthesis.speak(utterance);
              }} className="btn btn-primary btn-sm">🔊 Read Aloud</button>}
              <button type="button" onClick={() => { setShowStandup(false); window.speechSynthesis?.cancel(); }} className="btn btn-ghost btn-sm">Close</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Title *</label>
            <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setNameSuggestions([]); }} required placeholder="What needs to be done?" />
            {nameSuggestions.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>🤖 AI suggests:</div>
                {nameSuggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => { setForm(p => ({ ...p, title: s })); setNameSuggestions([]); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 4, fontSize: 12, background: 'var(--primary-light)', color: 'var(--primary)', marginBottom: 2, cursor: 'pointer', border: 'none' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Details, acceptance criteria..." style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="P0">P0 — Critical</option>
                <option value="P1">P1 — High</option>
                <option value="P2">P2 — Normal</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Assignee</label>
              <select value={form.assigneeId} onChange={e => setForm(p => ({ ...p, assigneeId: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => m.userId && <option key={m.userId._id} value={m.userId._id}>{m.userId.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Due date</label>
              <input type="date" value={form.dueDate || ''} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Labels (comma-separated)</label>
            <input value={form.labels} onChange={e => setForm(p => ({ ...p, labels: e.target.value }))} placeholder="bug, feature, ux" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectBoard() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [presence, setPresence] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('kanban');
  const [cursors, setCursors] = useState({});
  const [remoteDragging, setRemoteDragging] = useState({});
  const [taskViewers, setTaskViewers] = useState({});
  const [projectSummary, setProjectSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    loadData();
    const s = getSocket();
    s.emit('join:project', { projectId, userId: user._id, userName: user.name, avatar: user.avatar });
    s.on('presence:update', setPresence);
    s.on('task:moved', task => setTasks(prev => prev.map(t => t._id === task._id ? task : t)));
    s.on('task:updated', task => setTasks(prev => prev.map(t => t._id === task._id ? task : t)));
    s.on('task:created', task => setTasks(prev => [...prev, task]));
    s.on('task:deleted', ({ _id }) => setTasks(prev => prev.filter(t => t._id !== _id)));
    s.on('cursor:move', (data) => setCursors(prev => ({ ...prev, [data.socketId]: data })));
    s.on('card-drag-start', ({ cardId, userName }) => setRemoteDragging(p => ({ ...p, [cardId]: userName })));
    s.on('card-drag-end', ({ cardId }) => setRemoteDragging(p => { const next = {...p}; delete next[cardId]; return next; }));
    s.on('task:viewing', ({ taskId, userName }) => setTaskViewers(p => ({ ...p, [taskId]: [...new Set([...(p[taskId]||[]), userName])] })));
    s.on('task:stopped-viewing', ({ taskId, userName }) => setTaskViewers(p => ({ ...p, [taskId]: (p[taskId]||[]).filter(u => u !== userName) })));
    s.on('task:reordered', updatedTasks => {
      setTasks(prev => {
        const map = new Map(updatedTasks.map(t => [t._id, t]));
        return prev.map(t => map.has(t._id) ? { ...t, order: map.get(t._id).order, status: map.get(t._id).status } : t).sort((a,b) => a.order - b.order);
      });
    });
    return () => {
      s.emit('leave:project', { projectId });
      s.off('presence:update'); s.off('task:moved'); s.off('task:updated'); s.off('task:created'); s.off('task:deleted'); s.off('task:reordered'); s.off('cursor:move'); s.off('card-drag-start'); s.off('card-drag-end'); s.off('task:viewing'); s.off('task:stopped-viewing');
    };
  }, [projectId]);

  const handleMouseMove = useCallback((e) => {
    getSocket().emit('cursor:move', { projectId, x: e.clientX, y: e.clientY });
  }, [projectId]);

  useEffect(() => {
    let timeout;
    const onMove = (e) => {
      if (timeout) return;
      timeout = setTimeout(() => { handleMouseMove(e); timeout = null; }, 50);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [handleMouseMove]);

  async function loadData() {
    try {
      const [pRes, tRes] = await Promise.all([api.get(`/projects/${projectId}`), api.get(`/tasks?projectId=${projectId}`)]);
      setProject(pRes.data);
      setTasks(tRes.data);
      const wsRes = await api.get(`/workspaces/${pRes.data.workspaceId}`);
      setWorkspace(wsRes.data);
      setMembers(wsRes.data.members || []);
    } catch { toast.error('Failed to load board'); }
    finally { setLoading(false); }
  }

  function getColumnTasks(colId) {
    return tasks.filter(t => t.status === colId && (
      (!filterAssignee || t.assigneeId?._id === filterAssignee) &&
      (!filterPriority || t.priority === filterPriority) &&
      (!search || t.title.toLowerCase().includes(search.toLowerCase()))
    ));
  }

  function handleDragStart({ active }) { 
    setActiveId(active.id); 
    const t = tasks.find(x => x._id === active.id);
    if (t) getSocket().emit('card-drag-start', { cardId: active.id, cardTitle: t.title, userId: user._id, userName: user.name, projectId });
  }

  async function handleDragEnd({ active, over }) {
    getSocket().emit('card-drag-end', { cardId: active?.id, projectId });
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find(t => t._id === active.id);
    const overTask = tasks.find(t => t._id === over.id);
    if (!activeTask) return;

    const targetColId = overTask ? overTask.status : over.id;
    const isSameColumn = activeTask.status === targetColId;

    let newTasks = [...tasks];

    if (isSameColumn) {
      if (active.id === over.id) return;
      const colTasks = newTasks.filter(t => t.status === targetColId).sort((a,b) => a.order - b.order);
      const oldIdx = colTasks.findIndex(t => t._id === active.id);
      const newIdx = colTasks.findIndex(t => t._id === over.id);
      const reorderedCol = arrayMove(colTasks, oldIdx, newIdx);
      
      const updates = reorderedCol.map((t, i) => ({ _id: t._id, order: i, status: targetColId }));
      newTasks = newTasks.map(t => {
        const u = updates.find(x => x._id === t._id);
        return u ? { ...t, order: u.order, status: u.status } : t;
      });
      setTasks(newTasks.sort((a,b) => a.order - b.order));
      try {
        await api.put('/tasks/reorder', { projectId, tasks: updates });
      } catch { toast.error('Failed to reorder'); loadData(); }
    } else {
      // Moving to different column
      let activeColTasks = newTasks.filter(t => t.status === activeTask.status).sort((a,b) => a.order - b.order);
      let targetColTasks = newTasks.filter(t => t.status === targetColId).sort((a,b) => a.order - b.order);
      
      activeColTasks = activeColTasks.filter(t => t._id !== active.id);
      const overIdx = targetColTasks.findIndex(t => t._id === over.id);
      const newIdx = overIdx >= 0 ? overIdx : targetColTasks.length;
      
      const movedTask = { ...activeTask, status: targetColId };
      targetColTasks.splice(newIdx, 0, movedTask);

      const updates = [
        ...activeColTasks.map((t, i) => ({ _id: t._id, order: i, status: t.status })),
        ...targetColTasks.map((t, i) => ({ _id: t._id, order: i, status: t.status }))
      ];

      newTasks = newTasks.map(t => {
        const u = updates.find(x => x._id === t._id);
        return u ? { ...t, order: u.order, status: u.status } : t;
      });
      setTasks(newTasks.sort((a,b) => a.order - b.order));
      try {
        await api.put('/tasks/reorder', { projectId, tasks: updates });
      } catch { toast.error('Failed to move task'); loadData(); }
    }
  }

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 20 }} />
      <div style={{ display: 'flex', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width: 280, height: 400, borderRadius: 14 }} />)}
      </div>
    </div>
  );

  return (
    <div>
      {/* Project header */}
      <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: project?.colourLabel }} />
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>{project?.name}</h1>
          {project?.techStack?.map(t => <span key={t} className="label-chip">{t}</span>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Presence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {presence.slice(0, 8).map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div className="avatar avatar-sm" title={p.userName} style={{ background: '#6366f1', border: '2px solid var(--surface)' }}>{p.avatar ? <img src={p.avatar} style={{width:'100%', height:'100%', borderRadius:'50%'}}/> : p.userName?.charAt(0)}</div>
   <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, background: '#10b981', border: '1px solid var(--surface)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              </div>
            ))}
            {presence.length > 8 && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>+{presence.length - 8} more</span>}
          </div>
          {/* Filters */}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ width: 140, padding: '5px 10px', fontSize: 12 }} />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 100, padding: '5px', fontSize: 12 }}>
            <option value="">Priority</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{ width: 110, padding: '5px', fontSize: 12 }}>
            <option value="">Assignee</option>
            {members.map(m => m.userId && <option key={m.userId._id} value={m.userId._id}>{m.userId.name}</option>)}
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6 }}>
            {['kanban', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)} className="btn btn-sm" style={{ borderRadius: 0, background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'white' : 'var(--text-2)' }}>
                {v === 'kanban' ? '⬜' : '☰'} {v}
              </button>
            ))}
          </div>
          <button onClick={async () => {
    setSummaryLoading(true);
    try { const r = await api.post('/ai/project-summary', { projectId }); setProjectSummary(r.data.summary); }
    catch { toast.error('AI unavailable'); } finally { setSummaryLoading(false); }
  }} className="btn btn-secondary btn-sm" disabled={summaryLoading}>{summaryLoading ? '...' : '🤖 Summary'}</button>
  <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Task</button>
        </div>
      </div>
      {projectSummary && (
        <div style={{ padding: '12px 24px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', fontSize: 13, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--primary)' }}>🤖 AI Project Summary</div><div style={{ color: 'var(--text-1)' }}>{projectSummary}</div></div>
            <button onClick={() => setProjectSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
          </div>
        </div>
      )}
      {view === 'kanban' ? (
        tasks.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <h3 style={{ marginBottom: 8, color: 'var(--text-1)' }}>No tasks in this project yet</h3>
            <p style={{ marginBottom: 20 }}>Break down your work into manageable pieces</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ Create First Task</button>
          </div>
        ) : (
        <div className="kanban-board">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {COLUMNS.map(col => (
              <KanbanColumn key={col.id} column={col} tasks={getColumnTasks(col.id)} onTaskClick={setSelectedTask} activeId={activeId} remoteDraggingState={remoteDragging} taskViewersState={taskViewers} />
            ))}
            <DragOverlay>
              {activeId ? <TaskCard task={tasks.find(t => t._id === activeId)} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
        )
      ) : (
        <div style={{ padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                  {['Title','Assignee','Priority','Status','Due date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase())).map(task => (
                  <tr key={task._id} onClick={() => setSelectedTask(task)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{task.title}</td>
                    <td style={{ padding: '10px 14px' }}>{task.assigneeId ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar user={task.assigneeId} size="avatar-sm" /><span style={{ fontSize: 12 }}>{task.assigneeId.name}</span></div> : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}</td>
                    <td style={{ padding: '10px 14px' }}><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 12, color: COLUMNS.find(c => c.id === task.status)?.color }}>{COLUMNS.find(c => c.id === task.status)?.label}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: task.dueDate && isPast(new Date(task.dueDate)) ? 'var(--danger)' : 'var(--text-2)' }}>
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTask && (
          <TaskModal task={selectedTask} project={project} members={members}
          onClose={() => { getSocket().emit('task:stopped-viewing', { projectId, taskId: selectedTask._id, userName: user.name }); setSelectedTask(null); }}
          onUpdate={updated => { setTasks(prev => prev.map(t => t._id === updated._id ? updated : t)); setSelectedTask(updated); }}
          onDelete={async id => { await api.delete(`/tasks/${id}`); setTasks(prev => prev.filter(t => t._id !== id)); }} />
      )}

      {showCreate && (
        <CreateTaskModal projectId={projectId} members={members}
          onClose={() => setShowCreate(false)}
          onCreate={task => setTasks(prev => [...prev, task])} />
      )}

      {/* Live Cursors */}
      {Object.values(cursors).map(c => (
        <div key={c.socketId} style={{ position: 'fixed', left: c.x, top: c.y, pointerEvents: 'none', zIndex: 9999, transition: 'all 0.1s linear', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
            <path d="M5.65376 21.0069L2.33878 2.65624C2.15822 1.65682 3.19526 0.906323 4.10304 1.37894L21.3653 10.368C22.2573 10.8327 22.2359 12.1287 21.3283 12.5574L14.2818 15.8863C14.0734 15.9848 13.9054 16.1558 13.8117 16.3659L10.6387 23.4776C10.2224 24.4107 8.87413 24.4144 8.44855 23.4839L5.65376 21.0069Z" fill="#6366f1" stroke="white" strokeWidth="1.5" />
          </svg>
          <div style={{ background: '#6366f1', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{c.userName}</div>
        </div>
      ))}
    </div>
  );
}
