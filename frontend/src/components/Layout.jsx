import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import toast from 'react-hot-toast';
import CommandPalette from './CommandPalette';

function Avatar({ user, size = '' }) {
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6'];
  const color = colors[(user?.name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`avatar ${size}`} style={{ background: user?.avatar ? 'transparent' : color }}>
      {user?.avatar ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

export { Avatar };

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showDevMind, setShowDevMind] = useState(false);
  const [devMindAlerts, setDevMindAlerts] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showWsSettings, setShowWsSettings] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState(null);

  useEffect(() => {
    loadWorkspaces();
    loadNotifications();
    const s = getSocket();
    s.emit('join:user', { userId: user._id });
    s.on('notification:new', n => {
      setNotifications(prev => [n, ...prev]);
      setUnread(prev => prev + 1);
      toast(n.message, { icon: '🔔' });
    });
    return () => s.off('notification:new');
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/\/project\/([^/]+)/);
    if (match) {
      setActiveProjectId(match[1]);
      loadDevMind(match[1]);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function loadWorkspaces() {
    try {
      const r = await api.get('/workspaces');
      setWorkspaces(r.data);
      if (r.data.length > 0) {
        setActiveWorkspace(r.data[0]);
        loadProjects(r.data[0]._id);
      }
    } catch (e) {}
  }

  async function loadProjects(wsId) {
    try {
      const r = await api.get(`/projects?workspaceId=${wsId}`);
      setProjects(r.data);
    } catch (e) {}
  }

  async function loadNotifications() {
    try {
      const r = await api.get('/notifications');
      setNotifications(r.data);
      setUnread(r.data.filter(n => !n.read).length);
    } catch (e) {}
  }

  async function loadDevMind(projectId) {
    try {
      const r = await api.post('/ai/devmind', { projectId });
      setDevMindAlerts(r.data.alerts || []);
    } catch (e) {}
  }

  async function markAllRead() {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  async function inviteMember(e) {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const r = await api.post(`/workspaces/${activeWorkspace._id}/invite`, { email: inviteEmail, role: 'member' });
      setInviteLink(window.location.origin + r.data.link);
      toast.success('Invite generated!');
      setInviteEmail('');
    } catch { toast.error('Failed to generate invite'); }
  }

  const navItems = activeProjectId ? [
    { label: 'Board', icon: '⬜', path: `/project/${activeProjectId}` },
    { label: 'Snippets', icon: '💻', path: `/project/${activeProjectId}/snippets` },
    { label: 'Wiki', icon: '📚', path: `/project/${activeProjectId}/wiki` },
    { label: 'Sprint', icon: '📊', path: `/project/${activeProjectId}/sprint` },
  ] : [];

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white', fontWeight: 700 }}>D</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>DevCollab</span>
          </div>
          {activeWorkspace && (
            <div className="ws-setting" onClick={() => setShowWsSettings(true)} style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span>{activeWorkspace.name}</span>
              <span className="gear-icon" style={{ fontSize: 12 }}>⚙️</span>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 8px', flex: 1, overflow: 'auto' }}>
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            🏠 <span>Dashboard</span>
          </Link>
          <Link to="/activity" className={`nav-item ${location.pathname === '/activity' ? 'active' : ''}`}>
            📋 <span>Activity</span>
          </Link>

          {projects.length > 0 && (
            <>
              <div style={{ margin: '12px 0 4px', padding: '0 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projects</div>
              {projects.map(p => (
                <div key={p._id}>
                  <Link to={`/project/${p._id}`} className={`nav-item ${activeProjectId === p._id ? 'active' : ''}`} style={{ paddingLeft: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.colourLabel, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </Link>
                  {activeProjectId === p._id && navItems.slice(1).map(item => (
                    <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`} style={{ paddingLeft: 24, fontSize: 12 }}>
                      {item.icon} <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </>
          )}

          {activeProjectId && devMindAlerts.length > 0 && (
            <div style={{ margin: '12px 0 4px', padding: '0 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DevMind</div>
          )}
          {activeProjectId && devMindAlerts.length > 0 && (
            <button onClick={() => setShowDevMind(!showDevMind)} className="nav-item" style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>🧠 Alerts</span>
              <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '99px', padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{devMindAlerts.length}</span>
            </button>
          )}
        </div>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--sidebar-border)' }}>
          <button onClick={toggleTheme} className="nav-item" style={{ width: '100%' }}>
            {theme === 'light' ? '🌙' : '☀️'} <span>{theme === 'light' ? 'Dark' : 'Light'} mode</span>
          </button>
          <Link to="/pricing" className="nav-item">
            {user?.plan === 'pro' ? '⭐' : '🚀'} <span>{user?.plan === 'pro' ? 'Pro plan' : 'Upgrade'}</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginTop: 4 }}>
            <Avatar user={user} size="avatar-sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} style={{ color: 'var(--text-tertiary)', fontSize: 16, padding: 2 }} title="Logout">↩</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main-content" style={{ flex: 1 }}>
        {/* Top bar */}
        <div style={{ height: 56, background: 'var(--bg-surface)', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ marginRight: 'auto' }}>
            <button 
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
            >
              <span>🔍</span>
              <span>Search...</span>
              <kbd className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded ml-1">⌘K</kbd>
            </button>
          </div>
  <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) markAllRead(); }} style={{ position: 'relative', padding: 8, borderRadius: 8, color: 'var(--text-secondary)' }}>
              🔔
              {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger)', color: 'white', borderRadius: '99px', fontSize: 9, fontWeight: 700, padding: '0 4px', minWidth: 14, textAlign: 'center' }}>{unread}</span>}
            </button>
            {showNotifs && (
              <div style={{ position: 'absolute', right: 0, top: '100%', width: 320, background: 'var(--bg-surface)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200, maxHeight: 400, overflow: 'auto' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--sidebar-border)', fontWeight: 600 }}>Notifications</div>
                {notifications.length === 0 ? <div style={{ padding: 20, color: 'var(--text-tertiary)', textAlign: 'center' }}>All caught up! 🎉</div> : notifications.slice(0, 10).map(n => (
                  <div key={n._id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--sidebar-border)', opacity: n.read ? 0.6 : 1, background: n.read ? 'transparent' : 'var(--primary-light)' }}>
                    <div style={{ fontSize: 13 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{new Date(n.createdAt).toRelativeDateString?.() || new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Avatar user={user} />
        </div>

        {/* DevMind panel */}
        {showDevMind && devMindAlerts.length > 0 && (
          <div style={{ margin: '16px 20px 0', background: 'var(--bg-surface)', border: '1px solid var(--sidebar-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🧠 DevMind Alerts</div>
              <button onClick={() => setShowDevMind(false)} style={{ color: 'var(--text-tertiary)' }}>✕</button>
            </div>
            {devMindAlerts.map(alert => (
              <div key={alert.id} className={`devmind-alert ${alert.severity}`}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{alert.message}</div>
                </div>
                {alert.action && (
                  <Link to={alert.actionLink || '#'} onClick={() => setShowDevMind(false)} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{alert.action} →</Link>
                )}
              </div>
            ))}
          </div>
        )}

        <Outlet />
        {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
      </div>

      {showWsSettings && activeWorkspace && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowWsSettings(false)}>
          <div className="modal" style={{ padding: 24, maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Workspace Settings</h2>
              <button onClick={() => setShowWsSettings(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Invite Members</h3>
              <form onSubmit={inviteMember} style={{ display: 'flex', gap: 8 }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="colleague@example.com" style={{ flex: 1 }} required />
                <button type="submit" className="btn btn-primary btn-sm">Generate Link</button>
              </form>
              {inviteLink && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--sidebar-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Invite link generated:</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={inviteLink} readOnly style={{ flex: 1, fontSize: 12, background: 'var(--bg-surface)', padding: '4px 8px' }} />
                    <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>Copy</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
