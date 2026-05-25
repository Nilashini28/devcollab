const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectBoard.jsx', 'utf8');

// 1. TaskCard props (remoteDragging, viewers)
code = code.replace(
  /function TaskCard\(\{ task, onClick, isDragging \}\) \{/,
  'function TaskCard({ task, onClick, isDragging, remoteDragging, taskViewers }) {'
);

code = code.replace(
  /className={`task-card \$\{overdue \? 'overdue' : ''\}`\}/,
  'className={`task-card ${overdue ? \'overdue\' : \'\'} ${remoteDragging ? \'remote-dragging\' : \'\'}`}'
);

code = code.replace(
  /<\/div>\s*<\/div>\s*\);\s*\}/,
  `      </div>
      {remoteDragging && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--primary-light)', boxShadow: 'var(--shadow-sm)' }}>
            Being moved by {remoteDragging}...
          </div>
        </div>
      )}
      {taskViewers && taskViewers.length > 0 && (
        <div style={{ position: 'absolute', top: -10, right: -10, background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, boxShadow: 'var(--shadow-sm)', zIndex: 10, animation: 'fadeIn 0.2s ease-out' }}>
          👁 {taskViewers[0]} {taskViewers.length > 1 ? \`+\${taskViewers.length-1}\` : ''} viewing
        </div>
      )}
    </div>
  );
}`
);

// 2. KanbanColumn pass props to TaskCard
code = code.replace(
  /function KanbanColumn\(\{ column, tasks, onTaskClick, activeId \}\) \{/,
  'function KanbanColumn({ column, tasks, onTaskClick, activeId, remoteDraggingState = {}, taskViewersState = {} }) {'
);

code = code.replace(
  /<TaskCard key=\{task\._id\} task=\{task\} onClick=\{onTaskClick\} isDragging=\{activeId === task\._id\} \/>/,
  '<TaskCard key={task._id} task={task} onClick={onTaskClick} isDragging={activeId === task._id} remoteDragging={remoteDraggingState[task._id]} taskViewers={taskViewersState[task._id]} />'
);

// 3. ProjectBoard state for remoteDragging, taskViewers, projectSummary
code = code.replace(
  /const \[cursors, setCursors\] = useState\(\{\}\);/,
  `const [cursors, setCursors] = useState({});
  const [remoteDragging, setRemoteDragging] = useState({});
  const [taskViewers, setTaskViewers] = useState({});
  const [projectSummary, setProjectSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);`
);

code = code.replace(
  /s\.on\('cursor:move', \(data\) => setCursors\(prev => \(\{ \.\.\.prev, \[data\.socketId\]: data \}\)\)\);/,
  `s.on('cursor:move', (data) => setCursors(prev => ({ ...prev, [data.socketId]: data })));
    s.on('card-drag-start', ({ cardId, userName }) => setRemoteDragging(p => ({ ...p, [cardId]: userName })));
    s.on('card-drag-end', ({ cardId }) => setRemoteDragging(p => { const next = {...p}; delete next[cardId]; return next; }));
    s.on('task:viewing', ({ taskId, userName }) => setTaskViewers(p => ({ ...p, [taskId]: [...new Set([...(p[taskId]||[]), userName])] })));
    s.on('task:stopped-viewing', ({ taskId, userName }) => setTaskViewers(p => ({ ...p, [taskId]: (p[taskId]||[]).filter(u => u !== userName) })));`
);

code = code.replace(
  /s\.off\('cursor:move'\);/,
  `s.off('cursor:move'); s.off('card-drag-start'); s.off('card-drag-end'); s.off('task:viewing'); s.off('task:stopped-viewing');`
);

// 4. Drag emit in ProjectBoard
code = code.replace(
  /function handleDragStart\(\{ active \}\) \{ setActiveId\(active\.id\); \}/,
  `function handleDragStart({ active }) { 
    setActiveId(active.id); 
    const t = tasks.find(x => x._id === active.id);
    if (t) getSocket().emit('card-drag-start', { cardId: active.id, cardTitle: t.title, userId: user._id, userName: user.name, projectId });
  }`
);

code = code.replace(
  /async function handleDragEnd\(\{ active, over \}\) \{/,
  `async function handleDragEnd({ active, over }) {
    getSocket().emit('card-drag-end', { cardId: active?.id, projectId });`
);

// 5. Update TaskModal AI Breakdown
code = code.replace(
  /<button onClick=\{\(\) => acceptSubtask\(t\)\} className="btn btn-sm btn-primary" disabled=\{t\.isDuplicate\}>\+ Add<\/button>/g,
  `<button onClick={() => {
    setBreakdown(p => ({...p, tasks: p.tasks.filter((_, idx) => idx !== i)}));
  }} className="btn btn-sm" style={{color: 'var(--danger)', marginRight: 6}}>✕</button>
  <button onClick={() => acceptSubtask(t)} className="btn btn-sm btn-primary" disabled={t.isDuplicate}>+ Add to Task</button>`
);

code = code.replace(
  /<div style=\{\{ fontWeight: 600, marginBottom: 10, fontSize: 13 \}\}>🤖 AI Generated Subtasks<\/div>/,
  `<div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>🤖 AI Task Breakdown</span>
    {breakdown?.tasks?.length > 0 && (
      <button onClick={async () => {
        try {
          await api.post('/tasks/bulk', { projectId: project._id, tasks: breakdown.tasks });
          toast.success(\`\${breakdown.tasks.length} tasks created on board\`);
          setBreakdown({ tasks: [] });
          setShowAiBreakdown(false);
        } catch { toast.error('Failed to create tasks'); }
      }} className="btn btn-sm btn-primary">Create All on Board</button>
    )}
  </div>`
);

// 6. Presence strip and Project Summary button
code = code.replace(
  /\{presence\.filter\(p => p\.userId !== user\._id\)\.slice\(0, 4\)\.map\(\(p, i\) => \(/,
  `{presence.slice(0, 8).map((p, i) => (`
);

code = code.replace(
  /<div className="avatar avatar-sm" title=\{p\.userName\} style=\{\{ background: '#6366f1', border: '2px solid var\(--surface\)' \}\}>\{p\.userName\?\.charAt\(0\)\}<\/div>/,
  `<div className="avatar avatar-sm" title={p.userName} style={{ background: '#6366f1', border: '2px solid var(--surface)' }}>{p.avatar ? <img src={p.avatar} style={{width:'100%', height:'100%', borderRadius:'50%'}}/> : p.userName?.charAt(0)}</div>
   <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, background: '#10b981', border: '1px solid var(--surface)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />`
);

code = code.replace(
  /\{presence\.length > 1 && <span style=\{\{ fontSize: 11, color: 'var\(--text-3\)' \}\}>\{presence\.length\} online<\/span>\}/,
  `{presence.length > 8 && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>+{presence.length - 8} more</span>}`
);

code = code.replace(
  /<button onClick=\{\(\) => setShowCreate\(true\)\} className="btn btn-primary btn-sm">\+ Task<\/button>/,
  `<button onClick={async () => {
    setSummaryLoading(true);
    try { const r = await api.post('/ai/project-summary', { projectId }); setProjectSummary(r.data.summary); }
    catch { toast.error('AI unavailable'); } finally { setSummaryLoading(false); }
  }} className="btn btn-secondary btn-sm" disabled={summaryLoading}>{summaryLoading ? '...' : '🤖 Summary'}</button>
  <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Task</button>`
);

code = code.replace(
  /<\/div>\s*<\/div>\s*\{view === 'kanban' \? \(/,
  `</div>
      </div>
      {projectSummary && (
        <div style={{ padding: '12px 24px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', fontSize: 13, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--primary)' }}>🤖 AI Project Summary</div><div style={{ color: 'var(--text-1)' }}>{projectSummary}</div></div>
            <button onClick={() => setProjectSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
          </div>
        </div>
      )}
      {view === 'kanban' ? (`
);

code = code.replace(
  /<KanbanColumn key=\{col\.id\} column=\{col\} tasks=\{getColumnTasks\(col\.id\)\} onTaskClick=\{setSelectedTask\} activeId=\{activeId\} \/>/g,
  `<KanbanColumn key={col.id} column={col} tasks={getColumnTasks(col.id)} onTaskClick={setSelectedTask} activeId={activeId} remoteDraggingState={remoteDragging} taskViewersState={taskViewers} />`
);

code = code.replace(
  /onClose=\{\(\) => setSelectedTask\(null\)\}/,
  `onClose={() => { getSocket().emit('task:stopped-viewing', { projectId, taskId: selectedTask._id, userName: user.name }); setSelectedTask(null); }}`
);

fs.writeFileSync('src/pages/ProjectBoard.jsx', code);
console.log('Patched ProjectBoard.jsx');
