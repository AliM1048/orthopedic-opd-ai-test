import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, Stethoscope,
  FileText, Pill, LogOut, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'NURSE', items: [
    { to: '/',           icon: LayoutDashboard, text: 'Dashboard' },
    { to: '/assessment', icon: ClipboardList,   text: 'New Assessment' },
  ]},
  { label: 'PHYSICIAN', items: [
    { to: '/evaluation',  icon: Stethoscope, text: 'Evaluation' },
    { to: '/diagnostics', icon: FileText,    text: 'Diagnostics' },
    { to: '/treatment',   icon: Pill,        text: 'Treatment Plan' },
  ]},
  { label: 'RECORDS', items: [
    { to: '/patients',    icon: Users,    text: 'All Patients' },
  ]},
];

export default function DashboardLayout({ children }) {
  const location = useLocation();

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
            <div className="sidebar-avatar">NS</div>
            <div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>Nurse Sara</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Orthopedic Ward</div>
            </div>
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
