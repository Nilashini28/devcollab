import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const LANGUAGES = ['javascript','typescript','python','java','go','cpp','rust','bash','sql','json'];

function CodeHighlight({ code, language }) {
  return (
    <pre className="code-block" style={{ maxHeight: 300 }}>
      <code>{code}</code>
    </pre>
  );
}

import CodeReviewPanel from '../components/CodeReviewPanel';

export default function Snippets() {
  const { projectId } = useParams();
  const [snippets, setSnippets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [prModal, setPrModal] = useState(false);
  const [prForm, setPrForm] = useState({ diff: '', files: '', taskTitle: '' });
  const [prResult, setPrResult] = useState(null);
  const [prLoading, setPrLoading] = useState(false);
  const [form, setForm] = useState({ title: '', language: 'javascript', code: '', tags: '', description: '', linkedTaskId: '' });
  const [reviewSnippet, setReviewSnippet] = useState(null);

  useEffect(() => {
    loadData();
    api.get(`/tasks?projectId=${projectId}`).then(r => setTasks(r.data)).catch(() => {});
  }, [projectId]);

  async function loadData() {
    try {
      const r = await api.get(`/snippets?projectId=${projectId}`);
      setSnippets(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    } catch (e) {
      setLoadError(true);
      console.error('Failed to load snippets:', e);
    }
    finally { setLoading(false); }
  }

  async function createSnippet(e) {
    e.preventDefault();
    try {
      const tags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
      const r = await api.post('/snippets', { ...form, tags, projectId });
      setSnippets(p => [r.data, ...p]);
      setSelected(r.data);
      setShowCreate(false);
      setForm({ title: '', language: 'javascript', code: '', tags: '', description: '', linkedTaskId: '' });
      toast.success('Snippet saved!');
    } catch { toast.error('Failed to create snippet'); }
  }

  async function applyFixToSnippet(fixedCode) {
    if (!selected) return;
    try {
      const r = await api.put(`/snippets/${selected._id}`, { code: fixedCode });
      setSnippets(p => p.map(s => s._id === selected._id ? { ...r.data, aiReview: selected.aiReview } : s));
      setSelected({ ...r.data, aiReview: selected.aiReview });
      toast.success('Snippet updated with AI fixes!');
    } catch { toast.error('Failed to apply fix'); }
  }

  async function runAiReview(snippet) {
    setReviewLoading(true);
    try {
      const task = tasks.find(t => t._id === snippet.linkedTaskId?._id || t._id === snippet.linkedTaskId);
      const r = await api.post('/ai/code-review', { snippetId: snippet._id, code: snippet.code, language: snippet.language, taskDescription: task?.description || task?.title, projectId });
      const updated = { ...snippet, aiReview: r.data };
      setSnippets(p => p.map(s => s._id === snippet._id ? updated : s));
      setSelected(updated);
    } catch { toast.error('AI review unavailable'); }
    finally { setReviewLoading(false); }
  }

  async function generatePR(e) {
    e.preventDefault();
    setPrLoading(true);
    try {
      const r = await api.post('/ai/pr-description', { ...prForm, files: prForm.files.split(',').map(s => s.trim()) });
      setPrResult(r.data);
    } catch { toast.error('AI unavailable'); } finally { setPrLoading(false); }
  }

  async function deleteSnippet(id) {
    await api.delete(`/snippets/${id}`);
    setSnippets(p => p.filter(s => s._id !== id));
    setSelected(snippets.find(s => s._id !== id) || null);
    toast.success('Deleted');
  }

  const filtered = snippets.filter(s =>
    (!search || s.title.toLowerCase().includes(search.toLowerCase()) || s.tags?.some(t => t.includes(search.toLowerCase()))) &&
    (!filterLang || s.language === filterLang)
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Sidebar list */}
      <div style={{ width: 280, borderRight: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search snippets..." style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} />
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={filterLang} onChange={e => setFilterLang(e.target.value)} style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}>
              <option value="">All languages</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button onClick={() => setPrModal(true)} className="btn btn-secondary btn-sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>PR gen</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 68, margin: 8, borderRadius: 8 }} />) :
            loadError ? (
              <div className="flex flex-col items-center justify-center text-center p-6 mt-10">
                <div className="text-4xl mb-3">⚠️</div>
                <p className="font-medium text-gray-500">Couldn't load snippets</p>
                <p className="text-sm text-gray-400 mt-1">Check your connection or try again</p>
                <button onClick={loadData} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
                  Retry
                </button>
              </div>
            ) :
            filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💻</div>
                <div>No snippets yet</div>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Add first snippet</button>
              </div>
            ) :
            filtered.map(s => (
              <div key={s._id} onClick={() => setSelected(s)} style={{ padding: '12px 14px', borderBottom: '1px solid var(--sidebar-border)', cursor: 'pointer', background: selected?._id === s._id ? 'var(--primary-light)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: selected?._id === s._id ? 'var(--primary)' : 'var(--text-primary)' }}>{s.title}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-base)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{s.language}</span>
                </div>
                {s.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{s.tags.slice(0,3).map(t => <span key={t} style={{ fontSize: 10, padding: '1px 5px', background: 'var(--bg-base)', borderRadius: 3, color: 'var(--text-secondary)' }}>{t}</span>)}</div>}
                {s.aiReview && <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 4 }}>✓ Reviewed: {s.aiReview.score}/10</div>}
              </div>
            ))
          }
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {!selected ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💻</div>
            <h3>Select a snippet or create one</h3>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selected.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-base)', borderRadius: 4, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selected.language}</span>
                  {selected.linkedTaskId && <span style={{ fontSize: 12, color: 'var(--primary)' }}>🔗 {selected.linkedTaskId.title || 'Linked task'}</span>}
                  {selected.authorId && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>by {selected.authorId.name}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(selected.code); toast.success('Copied!'); }} className="btn btn-secondary btn-sm">📋 Copy</button>
                <button onClick={() => setReviewSnippet(selected)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">🤖 AI Review</button>
                <button onClick={() => { if (confirm('Delete?')) deleteSnippet(selected._id); }} className="btn btn-sm" style={{ color: 'var(--danger)' }}>🗑</button>
              </div>
            </div>
            {selected.description && <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>{selected.description}</p>}
            {selected.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>{selected.tags.map(t => <span key={t} className="label-chip">{t}</span>)}</div>}
            <CodeHighlight code={selected.code} language={selected.language} />
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{ padding: 24 }}>
            <h2 style={{ marginBottom: 16 }}>New Snippet</h2>
            <form onSubmit={createSnippet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. JWT Auth Helper" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Language</label>
                  <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Linked task</label>
                  <select value={form.linkedTaskId} onChange={e => setForm(p => ({ ...p, linkedTaskId: e.target.value }))}>
                    <option value="">None</option>
                    {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                  </select></div>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Code *</label>
                <textarea value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required rows={8} placeholder="Paste your code here..." style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Tags</label>
                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="auth, utils, api" /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this do?" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save snippet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PR Description modal */}
      {prModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPrModal(false)}>
          <div className="modal" style={{ padding: 24, maxWidth: 680 }}>
            <h2 style={{ marginBottom: 16 }}>🚀 PR Description Generator</h2>
            {!prResult ? (
              <form onSubmit={generatePR} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Related task / feature</label>
                  <input value={prForm.taskTitle} onChange={e => setPrForm(p => ({ ...p, taskTitle: e.target.value }))} placeholder="e.g. Implement JWT auth with refresh tokens" /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Changed files (comma-separated)</label>
                  <input value={prForm.files} onChange={e => setPrForm(p => ({ ...p, files: e.target.value }))} placeholder="auth.js, middleware/auth.js, routes/users.js" /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Diff / description of changes</label>
                  <textarea value={prForm.diff} onChange={e => setPrForm(p => ({ ...p, diff: e.target.value }))} rows={6} placeholder="Paste git diff or describe what changed..." style={{ fontFamily: 'monospace', fontSize: 12 }} /></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setPrModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={prLoading}>{prLoading ? 'Generating...' : 'Generate PR'}</button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{prResult.title}</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{prResult.summary}</p>
                </div>
                <pre style={{ background: 'var(--bg-base)', padding: 14, borderRadius: 8, fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', maxHeight: 320 }}>{prResult.markdownBody}</pre>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={() => { navigator.clipboard.writeText(prResult.markdownBody); toast.success('Copied!'); }} className="btn btn-secondary" style={{ flex: 1 }}>📋 Copy</button>
                  <button onClick={() => { setPrResult(null); setPrForm({ diff: '', files: '', taskTitle: '' }); }} className="btn btn-ghost" style={{ flex: 1 }}>← Back</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {reviewSnippet && <CodeReviewPanel snippet={reviewSnippet} onClose={() => setReviewSnippet(null)} />}
    </div>
  );
}
