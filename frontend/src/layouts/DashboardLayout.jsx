import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, Stethoscope,
  LogOut, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'NURSE', items: [
    { to: '/',           icon: LayoutDashboard, text: 'Dashboard' },
    { to: '/assessment', icon: ClipboardList,   text: 'New Assessment' },
  ]},
  { label: 'PHYSICIAN', items: [
    { to: '/evaluation',  icon: Stethoscope, text: 'Evaluation' },
  ]},
  { label: 'RECORDS', items: [
    { to: '/patients',    icon: Users,    text: 'All Patients' },
  ]},
];

export default function DashboardLayout({ children, user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Activity size={20} /></div>
          <div className="sidebar-logo-text">
            <h2>OrthoOPD</h2>
            <p>Patient Management</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <item.icon size={18} />
                  {item.text}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'NS'}</div>
            <div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{user?.role === 'physician' ? 'Physician' : 'Orthopedic Ward'}</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, marginLeft: 'auto' }} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
