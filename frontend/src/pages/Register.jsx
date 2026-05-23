import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', fontWeight: 700, marginBottom: 12 }}>D</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create account</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 4 }}>Start collaborating with your team</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['name','email','password'].map(field => (
              <div key={field}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'capitalize' }}>{field}</label>
                <input type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} required placeholder={field === 'name' ? 'Your full name' : field === 'email' ? 'you@company.com' : '••••••••'} />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" style={{ marginTop: 4, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-2)', fontSize: 13 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
