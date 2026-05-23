import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Pricing() {
  const { user, updateUser } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', expiry: '12/26', cvc: '123' });
  const [loading, setLoading] = useState(false);

  async function handleUpgrade(e) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    try {
      const r = await api.put('/auth/upgrade');
      updateUser(r.data);
      setShowUpgrade(false);
      toast.success('🎉 Pro plan activated! Welcome to DevCollab Pro');
    } catch { toast.error('Upgrade failed'); } finally { setLoading(false); }
  }

  const plans = [
    {
      name: 'Free', price: '$0', period: 'forever',
      color: 'var(--border)',
      features: ['1 workspace', '3 projects', '5 team members', 'Basic Kanban board', 'Code snippets', 'Wiki pages', 'Basic AI features (10 calls/hr)'],
      cta: user ? 'Current plan' : 'Get started', disabled: !!user && user.plan === 'free'
    },
    {
      name: 'Pro', price: '$12', period: 'per user/month',
      color: 'var(--primary)',
      features: ['Unlimited workspaces', 'Unlimited projects', 'Unlimited members', 'All AI features', 'Priority AI response', 'Sprint Intelligence', 'DevMind ambient alerts', 'PR Description Generator', 'AI Codebase Explainer', 'Advanced analytics', 'Priority support'],
      cta: user?.plan === 'pro' ? '✅ Active' : 'Upgrade to Pro', highlight: true, disabled: user?.plan === 'pro'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', padding: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Pricing</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Simple, transparent pricing</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 16 }}>Start free. Upgrade when your team needs more.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 680, margin: '0 auto' }}>
          {plans.map(plan => (
            <div key={plan.name} className="card" style={{ border: plan.highlight ? `2px solid var(--primary)` : '1px solid var(--border)', position: 'relative', borderRadius: 16 }}>
              {plan.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most Popular</div>}
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</h2>
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 800 }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 13, marginLeft: 4 }}>{plan.period}</span>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center' }}
                disabled={plan.disabled} onClick={() => { if (plan.name === 'Pro' && !plan.disabled) setShowUpgrade(true); }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/" style={{ color: 'var(--primary)', fontSize: 14 }}>← Back to app</Link>
        </div>
      </div>

      {showUpgrade && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUpgrade(false)}>
          <div className="modal" style={{ padding: 28, maxWidth: 420 }}>
            <h2 style={{ marginBottom: 4 }}>Upgrade to Pro ⭐</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>All AI features, unlimited everything.</p>
            <form onSubmit={handleUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Card number</label>
                <input value={card.number} onChange={e => setCard(p => ({ ...p, number: e.target.value }))} placeholder="4242 4242 4242 4242" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Expiry</label>
                  <input value={card.expiry} onChange={e => setCard(p => ({ ...p, expiry: e.target.value }))} placeholder="MM/YY" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>CVC</label>
                  <input value={card.cvc} onChange={e => setCard(p => ({ ...p, cvc: e.target.value }))} placeholder="123" />
                </div>
              </div>
              <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>DevCollab Pro</span><strong>$12/mo</strong>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowUpgrade(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>{loading ? 'Processing...' : 'Pay $12/mo'}</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>Demo mode — no real charge</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
