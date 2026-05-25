import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Wiki() {
  const { projectId } = useParams();
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [prLoading, setPrLoading] = useState(false);

  useEffect(() => { loadPages(); }, [projectId]);

  async function loadPages() {
    try {
      const r = await api.get(`/wiki?projectId=${projectId}`);
      setPages(r.data);
      if (r.data.length > 0) loadPage(r.data[0]._id);
    } catch { toast.error('Failed to load wiki'); }
    finally { setLoading(false); }
  }

  async function loadPage(id) {
    setPageLoading(true);
    try {
      const r = await api.get(`/wiki/${id}`);
      setSelected(r.data);
      setContent(r.data.content || '');
      setTitle(r.data.title || '');
      setEditing(false);
      setAiSummary(null);
    } catch { toast.error('Failed to load page'); }
    finally { setPageLoading(false); }
  }

  async function savePage() {
    setSaving(true);
    try {
      const r = await api.put(`/wiki/${selected._id}`, { title, content });
      setSelected(r.data);
      setPages(prev => prev.map(p => p._id === r.data._id ? { ...p, title: r.data.title } : p));
      setEditing(false);
      toast.success('Saved!');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  }

  async function createPage(e) {
    e.preventDefault();
    try {
      const r = await api.post('/wiki', { projectId, title: newTitle, content: `# ${newTitle}\n\nStart writing here...` });
      setPages(prev => [...prev, r.data]);
      setShowCreate(false);
      setNewTitle('');
      loadPage(r.data._id);
      toast.success('Page created!');
    } catch { toast.error('Failed to create page'); }
  }

  async function deletePage() {
    if (!confirm('Delete this page?')) return;
    await api.delete(`/wiki/${selected._id}`);
    setPages(prev => prev.filter(p => p._id !== selected._id));
    setSelected(null);
    toast.success('Page deleted');
  }

  async function generatePrTemplate() {
    setPrLoading(true);
    try {
      const tr = await api.get(`/tasks?projectId=${projectId}`);
      const tasks = tr.data.filter(t => t.status === 'done' || t.status === 'inprogress');
      const taskTitles = tasks.map(t => t.title).join(', ');
      
      const r = await api.post('/ai/pr-description', { taskTitle: taskTitles });
      const prTitle = r.data.title || 'Draft PR';
      
      const w = await api.post('/wiki', { projectId, title: prTitle, content: r.data.markdownBody });
      setPages(prev => [...prev, w.data]);
      loadPage(w.data._id);
      toast.success('PR template created!');
    } catch { toast.error('Failed to generate PR template'); }
    finally { setPrLoading(false); }
  }

  async function generateSummary() {
    setSummaryLoading(true);
    try {
      const r = await api.post('/ai/wiki-summary', { content, title });
      setAiSummary(r.data.bullets);
    } catch { toast.error('AI unavailable'); } finally { setSummaryLoading(false); }
  }

  function renderMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^### (.+)/gm, '<h3 style="margin:16px 0 8px;font-size:15px">$1</h3>')
      .replace(/^## (.+)/gm, '<h2 style="margin:20px 0 10px;font-size:18px">$1</h2>')
      .replace(/^# (.+)/gm, '<h1 style="margin:0 0 16px;font-size:22px;font-weight:700">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--surface-3);padding:1px 5px;border-radius:3px;font-size:12px;font-family:monospace">$1</code>')
      .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre style="background:var(--surface-3);padding:12px;border-radius:6px;overflow:auto;font-size:12px;font-family:monospace;margin:10px 0">$1</pre>')
      .replace(/^- (.+)/gm, '<li style="padding:2px 0">$1</li>')
      .replace(/\n\n/g, '<br/><br/>');
  }

  const filtered = pages.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 240, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pages..." style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} />
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {loading ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, margin: '4px 8px', borderRadius: 6 }} />) :
            filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                No pages yet
                <div><button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Create first page</button></div>
              </div>
            ) :
            filtered.map(p => (
              <button key={p._id} onClick={() => loadPage(p._id)} className="nav-item" style={{ width: '100%', borderRadius: 0, background: selected?._id === p._id ? 'var(--primary-light)' : 'transparent', color: selected?._id === p._id ? 'var(--primary)' : 'var(--text-1)' }}>
                📄 <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{p.title}</span>
              </button>
            ))
          }
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <h3>Select a page or create one</h3>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ padding: '10px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              {editing ? (
                <input value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 16, fontWeight: 700, border: 'none', padding: 0, background: 'transparent', flex: 1 }} />
              ) : (
                <h2 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{selected.title}</h2>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={generateSummary} className="btn btn-secondary btn-sm" disabled={summaryLoading}>
                  {summaryLoading ? '...' : '🤖 Summary'}
                </button>
                <button onClick={generatePrTemplate} className="btn btn-secondary btn-sm" disabled={prLoading}>
                  {prLoading ? '...' : '🚀 Gen PR Template'}
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="btn btn-secondary btn-sm">
                  🕒 History ({selected.versions?.length || 0})
                </button>
                {editing ? (
                  <>
                    <button onClick={() => { setEditing(false); setContent(selected.content); setTitle(selected.title); }} className="btn btn-ghost btn-sm">Cancel</button>
                    <button onClick={savePage} className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">✏ Edit</button>
                    <button onClick={deletePage} className="btn btn-sm" style={{ color: 'var(--danger)' }}>🗑</button>
                  </>
                )}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Main content */}
              <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
                {pageLoading ? (
                  <div>
                    <div className="skeleton" style={{ height: 48, width: '60%', marginBottom: 32, borderRadius: 8 }} />
                    <div className="skeleton" style={{ height: 16, width: '100%', marginBottom: 12, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 12, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 16, width: '95%', marginBottom: 12, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 32, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 8 }} />
                  </div>
                ) : (
                  <>
                    {aiSummary && (
                      <div style={{ marginBottom: 20, background: 'var(--info-light)', border: '1px solid var(--info)', borderRadius: 'var(--radius)', padding: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>🤖 AI Summary</div>
                        {aiSummary.map((b, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0' }}>• {b}</div>)}
                        <button onClick={() => setAiSummary(null)} style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Dismiss</button>
                      </div>
                    )}
                    {editing ? (
                      <textarea value={content} onChange={e => setContent(e.target.value)}
                        style={{ width: '100%', minHeight: 'calc(100vh - 200px)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, fontFamily: 'monospace', fontSize: 13, resize: 'none', lineHeight: 1.7, background: 'var(--surface)' }}
                        placeholder="Write in Markdown..." />
                    ) : (
                      <div style={{ maxWidth: 720, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                    )}
                  </>
                )}
              </div>

              {/* Version history panel */}
              {showHistory && (
                <div style={{ width: 260, borderLeft: '1px solid var(--border)', overflow: 'auto', background: 'var(--surface)' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>Version History</div>
                  {selected.versions?.length === 0 ? (
                    <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>No versions yet</div>
                  ) : (
                    [...(selected.versions || [])].reverse().map((v, i) => (
                      <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>v{selected.versions.length - i}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(v.savedAt).toLocaleString()}</div>
                        <button onClick={() => { setContent(v.content); toast('Content restored from version'); }} className="btn btn-ghost btn-sm" style={{ marginTop: 4, fontSize: 11 }}>Restore</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{ padding: 24, maxWidth: 400 }}>
            <h2 style={{ marginBottom: 16 }}>New Wiki Page</h2>
            <form onSubmit={createPage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="Page title" autoFocus />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
