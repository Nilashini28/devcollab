import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

function ScoreDial({ score, label }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 36;
  const progress = ((100 - score) / 100) * circumference;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={36} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle cx={50} cy={50} r={36} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={progress} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={50} y={55} textAnchor="middle" style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px', fill: color, fontSize: 22, fontWeight: 700 }}>{score}</text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginTop: -8 }}>{label}</div>
    </div>
  );
}

export default function Sprint() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRetro, setShowRetro] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState(null);

  useEffect(() => { loadData(); }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const r = await api.post('/ai/sprint-intelligence', { projectId });
      setData(r.data);
    } catch { toast.error('AI analysis unavailable'); }
    finally { setLoading(false); }
  }

  async function explainCodebase() {
    setExplainLoading(true);
    try {
      const r = await api.post('/ai/explain-codebase', { projectId });
      setExplainResult(r.data);
      // Save as wiki page
      await api.post('/wiki', { projectId, title: `AI Architecture Overview — ${new Date().toLocaleDateString()}`, content: r.data.markdownContent });
      toast.success('Saved to wiki!');
    } catch { toast.error('AI unavailable'); } finally { setExplainLoading(false); }
  }

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
      </div>
      <div className="skeleton" style={{ height: 200 }} />
    </div>
  );

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-3)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div>Sprint data unavailable</div>
        <button onClick={loadData} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>📊 Sprint Intelligence</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={explainCodebase} className="btn btn-secondary btn-sm" disabled={explainLoading}>
            {explainLoading ? '🤖 Analyzing...' : '🤖 Explain Codebase'}
          </button>
          <button onClick={() => setShowRetro(!showRetro)} className="btn btn-secondary btn-sm">📝 Retrospective</button>
          <button onClick={loadData} className="btn btn-ghost btn-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Health score + summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <ScoreDial score={data.healthScore} label="Health" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: data.healthScore >= 75 ? 'var(--success)' : data.healthScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
              {data.healthLabel}
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4, maxWidth: 280 }}>{data.summary}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: data.velocityTrend === 'improving' ? 'var(--success-light)' : data.velocityTrend === 'declining' ? 'var(--danger-light)' : 'var(--surface-3)', color: data.velocityTrend === 'improving' ? 'var(--success)' : data.velocityTrend === 'declining' ? 'var(--danger)' : 'var(--text-2)', fontWeight: 600 }}>
                {data.velocityTrend === 'improving' ? '📈' : data.velocityTrend === 'declining' ? '📉' : '→'} Velocity {data.velocityTrend}
              </span>
            </div>
          </div>
        </div>

        {/* Velocity chart */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Tasks Closed per Day</div>
          {data.velocity?.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={data.velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="closed" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--text-3)', textAlign: 'center', paddingTop: 40 }}>Not enough data yet</div>}
        </div>

        {/* Task Distribution Pie Chart */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Task Distribution</div>
          {data.taskDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={data.taskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={4}>
                  {data.taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#64748b', '#f59e0b', '#3b82f6', '#10b981'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--text-3)', textAlign: 'center', paddingTop: 40 }}>No tasks available</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Blocked tasks */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: 'var(--danger)' }}>🚧 Likely Blocked</div>
          {data.blockedTasks?.length === 0 ? (
            <div style={{ color: 'var(--success)', fontSize: 13 }}>✅ No blocked tasks!</div>
          ) : data.blockedTasks?.map((t, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>In column for {t.daysInColumn} days · {t.assignee || 'Unassigned'}</div>
            </div>
          ))}
        </div>

        {/* At-risk tasks */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: 'var(--warning)' }}>⚠ Sprint Risk</div>
          {data.atRiskTasks?.length === 0 ? (
            <div style={{ color: 'var(--success)', fontSize: 13 }}>✅ Sprint on track!</div>
          ) : data.atRiskTasks?.map((t, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                <div style={{ fontSize: 11, background: 'var(--warning-light)', color: '#b45309', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                  {Math.round((t.confidence || 0.5) * 100)}% risk
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.reason}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Retrospective */}
      {showRetro && data.retrospective && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>📝 Sprint Retrospective (AI-Generated)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>✅ What went well</div>
              {data.retrospective.wentWell?.map((w, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text-2)' }}>• {w}</div>)}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>❌ What didn't go well</div>
              {data.retrospective.didntGoWell?.map((w, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text-2)' }}>• {w}</div>)}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 8 }}>🔍 Patterns to watch</div>
              {data.retrospective.patterns?.map((w, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text-2)' }}>• {w}</div>)}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--info)', marginBottom: 8 }}>💡 Recommendations</div>
              {data.retrospective.recommendations?.map((w, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text-2)' }}>• {w}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* Codebase explanation */}
      {explainResult && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>🤖 Codebase Architecture (AI-Generated)</div>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 14 }}>{explainResult.overview}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Components</div>
              {explainResult.components?.map((c, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name} <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>({c.language})</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.purpose}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Patterns</div>
              {explainResult.patterns?.map((p, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', padding: '2px 0' }}>• {p}</div>)}
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, marginTop: 12 }}>Gaps</div>
              {explainResult.gaps?.map((g, i) => <div key={i} style={{ fontSize: 13, color: 'var(--warning)', padding: '2px 0' }}>⚠ {g}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
