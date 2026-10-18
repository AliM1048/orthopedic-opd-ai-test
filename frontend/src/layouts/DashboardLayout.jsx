import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileSignature,
  LogOut, Activity, ChevronsLeft, Sun, Moon,
  Scissors, MessageCircle, Menu, Languages, ChevronRight
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

// The physician evaluation page isn't listed here — it only makes sense for
// a selected patient, so it's reached from the patient profile instead.
const NAV_ITEMS = [
  { labelKey: 'nav.sectionNurse', items: [
    { to: '/',            icon: LayoutDashboard, textKey: 'nav.dashboard' },
    { to: '/messages',    icon: MessageCircle,   textKey: 'nav.messages' },
  ]},
  { labelKey: 'nav.sectionSurgery', items: [
    { to: '/surgeries', icon: Scissors, textKey: 'nav.surgeries', restricted: true },
  ]},
  { labelKey: 'nav.sectionRecords', items: [
    { to: '/analytics',      icon: Activity,        textKey: 'nav.analytics', restricted: true },
    { to: '/records',        icon: Users,           textKey: 'nav.patientStatus' },
    { to: '/documents/new',  icon: FileSignature,   textKey: 'nav.generateDocument' },
  ]},
];

// Nurses see every page except surgeries and analytics (see
// NURSE_BLOCKED_PATHS in App.jsx for the matching route guard); every other
// role keeps seeing everything. `restricted: true` on a nav item above marks
// it as one of the pages hidden from that role.

const ROLE_LABEL_KEYS = { physician: 'common.physician', nurse: 'common.nurse' };

export default function DashboardLayout({ children, user }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Label bubble shown beside an icon on the collapsed rail. Rendered
  // position:fixed from the hovered item's rect so the sidebar's own
  // overflow scrolling can't clip it.
  const [railTip, setRailTip] = useState(null);
  const settingsRef = useRef(null);
  const isNurse = user?.role === 'nurse';
  const visibleNavSections = NAV_ITEMS
    .map((section) => ({ ...section, items: section.items.filter((item) => !(isNurse && item.restricted)) }))
    .filter((section) => section.items.length > 0);

  const showRailTip = (e, text) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    // In RTL the rail sits on the right, so the bubble opens to its left.
    setRailTip(document.documentElement.dir === 'rtl'
      ? { text, top, right: window.innerWidth - rect.left + 12 }
      : { text, top, left: rect.right + 12 });
  };
  const hideRailTip = () => setRailTip(null);

  const toggleCollapsed = () => {
    setRailTip(null);
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

  const closeMobileNav = () => setMobileNavOpen(false);

  // Click-outside to close the settings popover — matches how the mobile
  // nav drawer closes on backdrop tap, just without needing a full-screen
  // overlay since this one is small and anchored to its trigger.
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onDocClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [settingsOpen]);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      {/* ── Mobile-only top bar — the sidebar is an off-canvas drawer below
          the 900px breakpoint (see index.css "Mobile layout"), opened from
          here instead of always being on screen. ── */}
      {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={closeMobileNav} />}

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
            aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
            onMouseEnter={(e) => showRailTip(e, t('common.expandSidebar'))}
            onMouseLeave={hideRailTip}
          >
            {/* One icon, rotated by CSS when collapsed (see .sidebar-toggle) */}
            <ChevronsLeft size={14} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavSections.map((section) => (
            <div key={section.labelKey} className="sidebar-section">
              <div className="sidebar-section-label">{t(section.labelKey)}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  aria-label={t(item.textKey)}
                  onClick={() => { closeMobileNav(); hideRailTip(); }}
                  onMouseEnter={(e) => showRailTip(e, t(item.textKey))}
                  onMouseLeave={hideRailTip}
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

        {/* ── Settings — a single entry point for name/role, language, theme,
            and sign-out, instead of a row of separate always-visible icon
            buttons. Opens as a small card above the trigger. ── */}
        <div className="sidebar-footer" ref={settingsRef}>
          {settingsOpen && (
            <div className="settings-menu">
              <div className="settings-menu-section">{t('common.settings')}</div>
              <button type="button" className="settings-menu-item" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>
                <span className="settings-menu-item-left"><Languages size={15} /> {t('common.language')}</span>
                <span className="settings-menu-value">{language === 'ar' ? t('common.arabic') : t('common.english')}</span>
              </button>
              <button type="button" className="settings-menu-item" onClick={toggleTheme}>
                <span className="settings-menu-item-left">
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  {t('common.appearance')}
                </span>
                <span className="settings-menu-value">{theme === 'dark' ? t('common.darkMode') : t('common.lightMode')}</span>
              </button>

              <div className="settings-menu-divider" />
              <button type="button" className="settings-menu-item danger" onClick={handleLogout}>
                <span className="settings-menu-item-left"><LogOut size={15} /> {t('common.signOut')}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`settings-trigger${settingsOpen ? ' open' : ''}`}
            onClick={() => { hideRailTip(); setSettingsOpen((o) => !o); }}
            aria-label={t('common.settings')}
            onMouseEnter={(e) => !settingsOpen && showRailTip(e, user?.name || t('common.settings'))}
            onMouseLeave={hideRailTip}
          >
            <div className="sidebar-user">
              <div className="sidebar-avatar">{user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'NS'}</div>
              <div className="sidebar-user-text">
                <div className="sidebar-user-name">{user?.name || t('common.unknown')}</div>
                <div className="sidebar-user-role">{ROLE_LABEL_KEYS[user?.role] ? t(ROLE_LABEL_KEYS[user.role]) : t('common.orthopedicWard')}</div>
              </div>
              <ChevronRight size={14} className="sidebar-user-chevron" style={{ transform: settingsOpen ? 'rotate(90deg)' : 'none' }} />
            </div>
          </button>
        </div>
      </aside>

      {collapsed && railTip && (
        <div className="rail-tooltip" style={{ top: railTip.top, left: railTip.left, right: railTip.right }}>{railTip.text}</div>
      )}

      {/* ── Main ── */}
      <div className="main-content">
        {/* Mobile-only top bar — lives inside .main-content (which is
            margin-left:0 on mobile) rather than as a sibling of it, so it
            stacks above the page content instead of becoming its own flex
            item alongside it in .app-shell's row layout and stealing width
            from the page. Hidden on desktop, see index.css "Mobile layout". */}
        <div className="mobile-topbar">
          <button type="button" className="mobile-topbar-menu-btn" onClick={() => setMobileNavOpen(true)} title={t('common.openMenu')}>
            <Menu size={18} />
          </button>
          <div className="mobile-topbar-logo">
            <div className="sidebar-logo-icon"><Activity size={16} /></div>
            <span>{t('common.appName')}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
