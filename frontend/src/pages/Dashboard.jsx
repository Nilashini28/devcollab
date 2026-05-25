import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeWs, setActiveWs] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newProject, setNewProject] = useState({ name: '', description: '', techStack: '', colourLabel: '#6366f1' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const wsRes = await api.get('/workspaces');
      setWorkspaces(wsRes.data);
      if (wsRes.data.length > 0) {
        setActiveWs(wsRes.data[0]);
        const pRes = await api.get(`/projects?workspaceId=${wsRes.data[0]._id}`);
        setProjects(pRes.data);
      }
      
      try {
        const aRes = await api.get('/activity');
        setActivities(aRes.data);
      } catch (e) {}
    } catch (e) { toast.error('Failed to load workspace'); }
    finally { setLoading(false); }
  }

  async function createWorkspace() {
    const name = prompt('Workspace name:');
    if (!name) return;
    try {
      const r = await api.post('/workspaces', { name });
      setWorkspaces(p => [...p, r.data]);
      setActiveWs(r.data);
      toast.success('Workspace created!');
    } catch (e) { toast.error('Failed'); }
  }

  async function createProject(e) {
    e.preventDefault();
    try {
      const techStack = newProject.techStack.split(',').map(s => s.trim()).filter(Boolean);
      const r = await api.post('/projects', { ...newProject, techStack, workspaceId: activeWs._id });
      setProjects(p => [...p, r.data]);
      setShowNewProject(false);
      setNewProject({ name: '', description: '', techStack: '', colourLabel: '#6366f1' });
      toast.success('Project created!');
      navigate(`/project/${r.data._id}`);
    } catch (e) { toast.error('Failed to create project'); }
  }

  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899'];

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 4 }}>Here's what's happening with your projects</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={createWorkspace} className="btn btn-secondary btn-sm">+ Workspace</button>
          {activeWs && <button onClick={() => setShowNewProject(true)} className="btn btn-primary btn-sm">+ New Project</button>}
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ marginBottom: 8 }}>Create your first workspace</h2>
          <p style={{ marginBottom: 20 }}>A workspace is your team's home in DevCollab</p>
          <button onClick={createWorkspace} className="btn btn-primary">Create workspace</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
          {workspaces.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
              {workspaces.map(ws => (
                <button key={ws._id} onClick={() => { setActiveWs(ws); api.get(`/projects?workspaceId=${ws._id}`).then(r => setProjects(r.data)); }}
                  className="btn btn-sm" style={{ background: activeWs?._id === ws._id ? 'var(--primary)' : 'var(--surface)', color: activeWs?._id === ws._id ? 'white' : 'var(--text-1)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {ws.name}
                </button>
              ))}
            </div>
          )}

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-2)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <h3 style={{ marginBottom: 8 }}>No projects yet</h3>
              <p style={{ marginBottom: 20 }}>Create your first project to get started</p>
              <button onClick={() => setShowNewProject(true)} className="btn btn-primary">Create first project</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {projects.map(p => (
                <Link key={p._id} to={`/project/${p._id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ cursor: 'pointer', transition: 'all 0.15s', borderTop: `3px solid ${p.colourLabel}` }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h3>
                        <span style={{ fontSize: 11, color: p.status === 'active' ? 'var(--success)' : 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }}>{p.status}</span>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{p.description || 'No description'}</p>
                    {p.techStack?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {p.techStack.slice(0, 4).map(t => <span key={t} className="label-chip">{t}</span>)}
                        {p.techStack.length > 4 && <span className="label-chip">+{p.techStack.length - 4}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          </div>
          
          {/* Activity Feed */}
          <div style={{ width: 320, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h3>
            {activities.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activities.slice(0, 8).map(act => (
                  <div key={act._id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 6 }} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)' }}>
                        <span style={{ fontWeight: 600 }}>{act.actorId?.name}</span> {act.type.replace(':', ' ')} {act.payload?.title || act.payload?.pageId || ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{new Date(act.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showNewProject && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewProject(false)}>
          <div className="modal" style={{ padding: 24 }}>
            <h2 style={{ marginBottom: 20 }}>New Project</h2>
            <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Project name *</label>
                <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Frontend App" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="What is this project about?" style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Tech stack (comma-separated)</label>
                <input value={newProject.techStack} onChange={e => setNewProject(p => ({ ...p, techStack: e.target.value }))} placeholder="React, Node.js, MongoDB" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {colors.map(c => (
                    <button key={c} type="button" onClick={() => setNewProject(p => ({ ...p, colourLabel: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newProject.colourLabel === c ? '3px solid var(--text-1)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowNewProject(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
