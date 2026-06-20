import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { navItems } from '../../constants/nav';
import NotificationBell from './NotificationBell';

const THEME_CYCLE = ['light', 'dark', 'system'];

const ICONS = {
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}`.toUpperCase()
    : 'BC';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-full p-2 text-ink-muted hover:bg-bg-subtle lg:hidden"
            aria-label="Open navigation"
          >
            {ICONS.menu}
          </button>
          <Link to="/app/dashboard" className="font-display flex items-center gap-2 text-lg font-bold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm text-white">B</span>
            <span className="hidden sm:inline">Business Copilot</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-pill px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:bg-bg-subtle hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            className="rounded-full p-2 text-ink-muted hover:bg-bg-subtle hover:text-ink"
            aria-label="Toggle theme"
          >
            {ICONS[theme]}
          </button>
          <NotificationBell />
          <Link
            to="/app/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-ink"
            title={user?.email || 'Account'}
          >
            {initials}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-bg-subtle hover:text-ink sm:flex"
          >
            {ICONS.logout} Logout
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar-bg p-5 text-sidebar-ink shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-white">Business Copilot</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-1.5 text-sidebar-muted hover:bg-white/10"
                aria-label="Close navigation"
              >
                {ICONS.close}
              </button>
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-ink hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-ink hover:bg-white/5"
            >
              {ICONS.logout} Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
