import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Stethoscope, Users, FileSignature,
  LogOut, Activity, ChevronsLeft, ChevronsRight, Sun, Moon, ClipboardList, Scissors, MessageCircle
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const NAV_ITEMS = [
  { labelKey: 'nav.sectionNurse', items: [
    { to: '/',            icon: LayoutDashboard, textKey: 'nav.dashboard' },
    { to: '/messages',    icon: MessageCircle,   textKey: 'nav.messages' },
  ]},
  { labelKey: 'nav.sectionPhysician', items: [
    { to: '/evaluation',  icon: Stethoscope, textKey: 'nav.evaluation' },
  ]},
  { labelKey: 'nav.sectionSurgery', items: [
    { to: '/surgeries', icon: Scissors, textKey: 'nav.surgeries', restricted: true },
  ]},
  // { labelKey: 'nav.sectionClerk', items: [
  //   { to: '/clerk-tasks', icon: ClipboardList, textKey: 'nav.promTasks' },
  // ]},
  { labelKey: 'nav.sectionRecords', items: [
    { to: '/analytics',      icon: Activity,        textKey: 'nav.analytics', restricted: true },
    { to: '/records',        icon: Users,           textKey: 'nav.patientStatus', restricted: true },
    { to: '/documents/new',  icon: FileSignature,   textKey: 'nav.generateDocument', restricted: true },
  ]},
];

// Nurses are restricted to the dashboard + physician evaluation (see
// NURSE_ALLOWED_PATHS in App.jsx for the matching route guard); every other
// role keeps seeing everything, unchanged. `restricted: true` on a nav item
// above marks it as one of the pages hidden from that role.

export default function DashboardLayout({ children, user }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const isNurse = user?.role === 'nurse';
  const visibleNavSections = NAV_ITEMS
    .map((section) => ({ ...section, items: section.items.filter((item) => !(isNurse && item.restricted)) }))
    .filter((section) => section.items.length > 0);

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
            <h2>{t('common.appName')}</h2>
            <p>{t('common.appTagline')}</p>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
            style={{ marginLeft: collapsed ? 0 : 'auto' }}
          >
            {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavSections.map((section) => (
            <div key={section.labelKey}>
              <div className="sidebar-section-label">{t(section.labelKey)}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  title={t(item.textKey)}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <item.icon size={18} />
                  <span>{t(item.textKey)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'NS'}</div>
            <div className="sidebar-user-text">
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{user?.name || t('common.unknown')}</div>
              <div style={{ fontSize: 11, color: 'var(--sidebar-text)' }}>{user?.role === 'physician' ? t('common.physician') : t('common.orthopedicWard')}</div>
            </div>
            <LanguageSwitcher style={{ marginLeft: collapsed ? 0 : 'auto' }} />
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className="theme-toggle-btn" title={t('common.signOut')}>
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
