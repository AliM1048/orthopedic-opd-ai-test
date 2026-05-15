import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Stethoscope, HeartPulse } from 'lucide-react';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('nurse');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLogin) onLogin(role);
    navigate('/');
  };

  return (
    <div className="login-page">
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

        <form onSubmit={handleLogin}>
          <div className="login-role-grid">
            <button
              type="button"
              className={`role-btn ${role === 'nurse' ? 'selected' : ''}`}
              onClick={() => setRole('nurse')}
            >
              <div className="role-btn-icon"><HeartPulse size={24} /></div>
              <div className="role-btn-label">Nurse</div>
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'physician' ? 'selected' : ''}`}
              onClick={() => setRole('physician')}
            >
              <div className="role-btn-icon"><Stethoscope size={24} /></div>
              <div className="role-btn-label">Physician</div>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="name@hospital.com" defaultValue="nurse.sara@ortho.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="••••••••" defaultValue="password" />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center', marginTop: 8 }}>
            Sign In
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          Demo credentials are pre-filled. Select a role and sign in.
        </p>
      </div>
    </div>
  );
}
