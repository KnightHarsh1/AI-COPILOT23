import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { authService } from '../services/authService';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme_preference';
const VALID_THEMES = ['light', 'dark', 'system'];

function getSystemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

function applyResolvedTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && getSystemPrefersDark());
  root.classList.toggle('dark', isDark);
  return isDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(stored) ? stored : 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [hasLocalPreference] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));

  // Apply immediately and on every change so there's no flash of the wrong theme.
  useEffect(() => {
    setResolvedTheme(applyResolvedTheme(theme));
  }, [theme]);

  // Live-react to OS theme changes while in "system" mode.
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(applyResolvedTheme('system'));
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  // Seed from the user's saved server-side preference on a fresh browser
  // (one with no local choice yet) so theme follows the account, not just the device.
  useEffect(() => {
    if (!hasLocalPreference && isAuthenticated && user?.theme && VALID_THEMES.includes(user.theme)) {
      setThemeState(user.theme);
      localStorage.setItem(STORAGE_KEY, user.theme);
    }
  }, [isAuthenticated, user, hasLocalPreference]);

  const setTheme = (newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);

    if (isAuthenticated) {
      authService.updatePreferences({ theme: newTheme }).catch(() => {
        // Non-fatal — the local preference still applies for this browser.
      });
    }
  };

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
