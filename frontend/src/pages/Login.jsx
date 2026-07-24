import { useState } from 'react';
import { Activity, Sun, Moon } from 'lucide-react';
import api from '../api';
import { useTheme } from '../hooks/useTheme';

export default function Login({ onLogin }) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('nurse.sara@ortho.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { access_token, user } = res.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      if (onLogin) onLogin(access_token, user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><Activity size={24} /></div>
          <div>
            <h1>OrthoOPD</h1>
            <p>Patient Management System</p>
          </div>
        </div>

        <h2 className="login-title">Welcome Back</h2>
        <p className="login-sub">Sign in to access the orthopedic patient management system.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              type="text"
              placeholder="User"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center', marginTop: 8 }} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
          Demo credentials are pre-filled — just sign in.
        </p>
      </div>
    </div>
  );
}
