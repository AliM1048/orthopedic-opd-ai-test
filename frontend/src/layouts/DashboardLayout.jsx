import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Stethoscope,
  LogOut, Activity, ChevronsLeft, ChevronsRight, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const NAV_ITEMS = [
  { label: 'NURSE', items: [
    { to: '/',           icon: LayoutDashboard, text: 'Dashboard' },
  ]},
  { label: 'PHYSICIAN', items: [
    { to: '/evaluation',  icon: Stethoscope, text: 'Evaluation' },
  ]},
  { label: 'RECORDS', items: [
    { to: '/analytics',   icon: Activity, text: 'Analytics' },
  ]},
];

export default function DashboardLayout({ children, user }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Activity size={20} /></div>
          <div className="sidebar-logo-text">
            <h2>OrthoOPD</h2>
            <p>Patient Management</p>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ marginLeft: collapsed ? 0 : 'auto' }}
          >
            {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
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
                  title={item.text}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <item.icon size={18} />
                  <span>{item.text}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'NS'}</div>
            <div className="sidebar-user-text">
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{user?.role === 'physician' ? 'Physician' : 'Orthopedic Ward'}</div>
            </div>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ marginLeft: collapsed ? 0 : 'auto' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className="theme-toggle-btn" title="Sign out">
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
