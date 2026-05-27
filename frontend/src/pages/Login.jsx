import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('judge@demo.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(demoEmail) {
    setEmail(demoEmail);
    setPassword('password123');
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', fontWeight: 700, marginBottom: 12 }}>D</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Sign in to DevCollab</p>
        </div>
        <div className="card">
          <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13, border: '1px solid var(--sidebar-border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Preloaded Demo Accounts</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => demoLogin('alice@demo.com')} className="btn btn-secondary btn-sm" disabled={loading}>Alice (Dev)</button>
              <button type="button" onClick={() => demoLogin('bob@demo.com')} className="btn btn-secondary btn-sm" disabled={loading}>Bob (PM)</button>
              <button type="button" onClick={() => demoLogin('judge@demo.com')} className="btn btn-secondary btn-sm" disabled={loading}>Judge (Hackathon)</button>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 4, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
            No account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
