import { useState, useEffect } from 'react';
import api from '../utils/api';

const TYPE_ICONS = { 'task:moved': '→', 'task:created': '✚', 'task:updated': '✎', 'comment:added': '💬', 'wiki:created': '📄', 'wiki:updated': '✎', 'snippet:created': '💻', 'project:created': '📁', 'member:joined': '👋', 'ai:alert': '🤖' };

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/activity?limit=80').then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  function timeAgo(date) {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function describeEvent(e) {
    const p = e.payload || {};
    switch (e.type) {
      case 'task:moved': return `moved "${p.title}" from ${p.from} to ${p.to}`;
      case 'task:created': return `created task "${p.title}"`;
      case 'comment:added': return `commented on "${p.taskTitle}"`;
      case 'wiki:created': return `created wiki page "${p.title}"`;
      case 'wiki:updated': return `updated wiki page "${p.title}"`;
      case 'snippet:created': return `added snippet "${p.title}"`;
      case 'project:created': return `created project "${p.name}"`;
      default: return e.type;
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Activity Feed</h1>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div>No activity yet</div>
        </div>
      ) : (
        <div>
          {events.map(e => (
            <div key={e._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {TYPE_ICONS[e.type] || '•'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{e.actorId?.name || 'System'}</strong> {describeEvent(e)}
                  {e.projectId?.name && <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>in {e.projectId.name}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{timeAgo(e.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
