import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { navItems } from '../../constants/nav';
import { NAV_ICONS } from './navIcons';
import NotificationBell from './NotificationBell';
import FloatingAssistant from './FloatingAssistant';
import MotionBackground from './MotionBackground';

const THEME_CYCLE = ['light', 'dark', 'system'];

// Mirror of the avatar colour presets in Settings, so a chosen colour avatar
// renders identically in the navbar.
const AVATAR_COLORS = {
  indigo: '#4338ca', emerald: '#059669', amber: '#d97706',
  rose: '#e11d48', sky: '#0284c7', violet: '#7c3aed',
};

const ICONS = {
  sun: <Sun size={16} strokeWidth={2} />,
  moon: <Moon size={16} strokeWidth={2} />,
  system: <Monitor size={16} strokeWidth={2} />,
  menu: <Menu size={20} strokeWidth={2} />,
  close: <X size={20} strokeWidth={2} />,
  logout: <LogOut size={16} strokeWidth={2} />,
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
    <>
    <MotionBackground />
    <FloatingAssistant />
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
                className={`group relative rounded-pill px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:bg-bg-subtle hover:text-ink'
                }`}
              >
                {item.label}
                <span className={`pointer-events-none absolute -bottom-0.5 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 ${isActive ? 'w-5' : 'w-0 group-hover:w-4'}`} />
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
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-bg-subtle text-xs font-semibold text-ink"
            title={user?.email || 'Account'}
            style={user?.avatar_preset && !user?.avatar_url ? { backgroundColor: AVATAR_COLORS[user.avatar_preset] || undefined, color: '#fff' } : undefined}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
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
                const Icon = NAV_ICONS[item.label];
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-ink hover:bg-white/5'
                    }`}
                  >
                    {Icon && <Icon size={17} strokeWidth={2} />}
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
    </>
  );
}

export default Navbar;
