import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { authService } from "../services/authService";

const AppearanceContext = createContext(null);
const STORAGE_KEY = "appearance_preferences_v1";
const PRESETS_KEY = "appearance_presets_v1";

// Every appearance choice lives here. Defaults reproduce the current
// ("Classic") dashboard exactly, so an upgraded build looks identical until
// the user opts into something else.
// Ten curated accent shades. Each sets the primary colour (and its hover) used
// across buttons, links, highlights, and active states. `primary` / `hover` are
// "R G B" triples matching the --c-primary CSS variable format. `swatch` is a
// ready CSS colour for the selection square shown in Settings.
export const ACCENT_THEMES = [
  { id: "indigo",   label: "Indigo",      primary: "99 102 241",  hover: "129 140 248", swatch: "rgb(99 102 241)" },
  { id: "violet",   label: "Neon Violet", primary: "109 93 252",  hover: "139 125 255", swatch: "rgb(109 93 252)" },
  { id: "blue",     label: "Ocean Blue",  primary: "59 130 246",  hover: "96 165 250",  swatch: "rgb(59 130 246)" },
  { id: "teal",     label: "Teal",        primary: "20 184 166",  hover: "45 212 191",  swatch: "rgb(20 184 166)" },
  { id: "emerald",  label: "Emerald",     primary: "16 185 129",  hover: "52 211 153",  swatch: "rgb(16 185 129)" },
  { id: "amber",    label: "Amber Gold",  primary: "217 159 56",  hover: "234 179 88",  swatch: "rgb(217 159 56)" },
  { id: "rose",     label: "Rose",        primary: "244 63 94",   hover: "251 113 133", swatch: "rgb(244 63 94)" },
  { id: "crimson",  label: "Crimson",     primary: "225 72 72",   hover: "239 110 110", swatch: "rgb(225 72 72)" },
  { id: "cyan",     label: "Cyan",        primary: "6 182 212",   hover: "34 211 238",  swatch: "rgb(6 182 212)" },
  { id: "slate",    label: "Graphite",    primary: "100 116 139", hover: "148 163 184", swatch: "rgb(100 116 139)" },
];
const ACCENT_BY_ID = ACCENT_THEMES.reduce((m, a) => ((m[a.id] = a), m), {});

// Full theme palettes. Each overrides the core surface CSS variables so the
// entire UI (backgrounds, cards, borders, sidebar) re-skins instantly. Values
// are "R G B" triples matching the --c-* variables in index.css.
export const THEMES = [
  {
    id: "midnight", label: "Executive Neon",
    vars: { "--c-bg": "7 11 20", "--c-bg-subtle": "15 23 42", "--c-surface": "17 24 39", "--c-border": "30 38 58", "--c-ink": "241 244 252", "--c-ink-muted": "148 156 178", "--c-sidebar-bg": "11 16 28", "--c-primary": "109 93 252", "--c-primary-hover": "139 125 255" },
  },
  {
    id: "sapphire", label: "Royal Sapphire",
    vars: { "--c-bg": "10 15 28", "--c-bg-subtle": "16 23 40", "--c-surface": "18 27 48", "--c-border": "33 46 74", "--c-ink": "236 242 255", "--c-ink-muted": "148 163 196", "--c-sidebar-bg": "8 12 24", "--c-primary": "59 130 246", "--c-primary-hover": "96 165 250" },
  },
  {
    id: "graphite", label: "Graphite Gold",
    vars: { "--c-bg": "18 18 19", "--c-bg-subtle": "26 26 28", "--c-surface": "30 30 32", "--c-border": "48 48 52", "--c-ink": "245 243 238", "--c-ink-muted": "163 161 154", "--c-sidebar-bg": "13 13 14", "--c-primary": "217 159 56", "--c-primary-hover": "234 179 88" },
  },
  {
    id: "emerald", label: "Emerald Finance",
    vars: { "--c-bg": "9 18 16", "--c-bg-subtle": "14 27 24", "--c-surface": "16 32 28", "--c-border": "30 54 47", "--c-ink": "235 252 246", "--c-ink-muted": "143 176 165", "--c-sidebar-bg": "7 14 12", "--c-primary": "16 185 129", "--c-primary-hover": "52 211 153" },
  },
  {
    id: "aipurple", label: "AI Purple",
    vars: { "--c-bg": "17 13 24", "--c-bg-subtle": "25 19 36", "--c-surface": "29 22 42", "--c-border": "49 38 68", "--c-ink": "243 238 252", "--c-ink-muted": "168 156 188", "--c-sidebar-bg": "13 10 19", "--c-primary": "139 92 246", "--c-primary-hover": "167 139 250" },
  },
];
const THEME_BY_ID = THEMES.reduce((m, t) => ((m[t.id] = t), m), {});

// Font choices. `stack` is the CSS font-family applied to --font-sans/display.
export const FONTS = [
  { id: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif" },
  { id: "manrope", label: "Manrope", stack: "'Manrope', 'Inter', system-ui, sans-serif" },
  { id: "jakarta", label: "Plus Jakarta Sans", stack: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  { id: "plex", label: "IBM Plex Sans", stack: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" },
];
const FONT_BY_ID = FONTS.reduce((m, f) => ((m[f.id] = f), m), {});

// The Today-tab widgets the Layout Manager / Visibility Manager control.
// `id` matches the render switch in CommandCenterPage; order here is the
// default order.
export const DASHBOARD_WIDGETS = [
  { id: "kpis", label: "KPI Cards" },
  { id: "money", label: "Money Summary" },
  { id: "health", label: "Business Health" },
  { id: "cash", label: "Cash & Working Capital" },
  { id: "changes", label: "What Changed & Freshness" },
  { id: "aicfo", label: "AI CFO Briefing" },
];
export const DEFAULT_WIDGET_ORDER = DASHBOARD_WIDGETS.map((w) => w.id);

export const DEFAULT_APPEARANCE = {
  theme: "midnight",              // full theme palette (see THEMES)
  fontFamily: "jakarta",          // Plus Jakarta Sans default (Executive Neon)
  sidebarMode: "expanded",        // expanded | compact | auto
  carouselRotationMs: 7000,       // hero carousel auto-rotate interval (0 = off)
  widgetOrder: DEFAULT_WIDGET_ORDER,
  hiddenWidgets: [],              // ids of widgets the user has hidden
  dashboardTheme: "classic",      // classic | modern | executive | finance | command
  accentTheme: "violet",          // accent colour shade (see ACCENT_THEMES)
  customMode: false,              // when true, individual component picks below win
  kpiStyle: "classic",            // classic | sparklines | glass | executive | command
  mainChart: "classic",           // classic | gradientArea | stacked | executiveTrend | forecast | waterfall
  healthStyle: "classic",         // classic | ring | gauge | shield | orb | credit
  healthSkin: "classic",          // classic | neon | glass | gradient | cyberpunk | gold
  insightsStyle: "classic",       // classic | cards | executive | chat | command
  alertsStyle: "classic",         // classic | timeline | priority | matrix | feed
  recommendationsStyle: "classic",// classic | cards | advisor | actionPlan
  density: "comfortable",         // comfortable | compact | executive | dataHeavy
  animationLevel: "standard",     // off | minimal | standard | premium
  layoutMode: "standard",         // standard | executive | analytics | command
};

const VALID = {
  theme: THEMES.map((t) => t.id),
  fontFamily: FONTS.map((f) => f.id),
  sidebarMode: ["expanded", "compact", "auto"],
  carouselRotationMs: [0, 5000, 7000, 10000, 15000],
  dashboardTheme: ["classic", "modern", "executive", "finance", "command"],
  accentTheme: ACCENT_THEMES.map((a) => a.id),
  kpiStyle: ["classic", "sparklines", "glass", "executive", "command"],
  mainChart: ["classic", "gradientArea", "stacked", "executiveTrend", "forecast", "waterfall"],
  healthStyle: ["classic", "ring", "gauge", "shield", "orb", "credit"],
  healthSkin: ["classic", "neon", "glass", "gradient", "cyberpunk", "gold"],
  insightsStyle: ["classic", "cards", "executive", "chat", "command"],
  alertsStyle: ["classic", "timeline", "priority", "matrix", "feed"],
  recommendationsStyle: ["classic", "cards", "advisor", "actionPlan"],
  density: ["comfortable", "compact", "executive", "dataHeavy"],
  animationLevel: ["off", "minimal", "standard", "premium"],
  layoutMode: ["standard", "executive", "analytics", "command"],
};

function sanitize(raw) {
  const out = { ...DEFAULT_APPEARANCE };
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(DEFAULT_APPEARANCE)) {
    const v = raw[key];
    if (key === "customMode") {
      out.customMode = Boolean(v);
    } else if (key === "widgetOrder") {
      // Keep only known widget ids, preserve order, append any missing defaults.
      if (Array.isArray(v)) {
        const known = v.filter((id) => DEFAULT_WIDGET_ORDER.includes(id));
        for (const id of DEFAULT_WIDGET_ORDER) if (!known.includes(id)) known.push(id);
        out.widgetOrder = known;
      }
    } else if (key === "hiddenWidgets") {
      if (Array.isArray(v)) out.hiddenWidgets = v.filter((id) => DEFAULT_WIDGET_ORDER.includes(id));
    } else if (VALID[key]) {
      if (VALID[key].includes(v)) out[key] = v;
    }
  }
  return out;
}

function loadLocal() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch (_) {
    return { ...DEFAULT_APPEARANCE };
  }
}

function loadPresets() {
  try {
    const arr = JSON.parse(localStorage.getItem(PRESETS_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

export function AppearanceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [appearance, setAppearance] = useState(loadLocal);
  const [presets, setPresets] = useState(loadPresets);
  const [hasLocal] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));

  // Reflect density + animation level on <html> so any component (and global
  // CSS) can respond. These are plain data attributes, never inline styles.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-density", appearance.density);
    root.setAttribute("data-animations", appearance.animationLevel);
    root.setAttribute("data-sidebar-mode", appearance.sidebarMode);
  }, [appearance.density, appearance.animationLevel, appearance.sidebarMode]);

  // Apply the full theme palette so the whole UI re-skins.
  useEffect(() => {
    const root = document.documentElement;
    const theme = THEME_BY_ID[appearance.theme] || THEME_BY_ID.midnight;
    if (theme) for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  }, [appearance.theme]);

  // Font family.
  useEffect(() => {
    const root = document.documentElement;
    const font = FONT_BY_ID[appearance.fontFamily] || FONT_BY_ID.inter;
    if (font) {
      root.style.setProperty("--font-sans", font.stack);
      root.style.setProperty("--font-display", font.stack);
    }
  }, [appearance.fontFamily]);

  // Apply the chosen accent shade by overriding the primary CSS variables.
  // Runs after theme (depends on it) so an explicit accent wins for --c-primary.
  useEffect(() => {
    const root = document.documentElement;
    const accent = ACCENT_BY_ID[appearance.accentTheme] || ACCENT_BY_ID.indigo;
    if (accent) {
      root.style.setProperty("--c-primary", accent.primary);
      root.style.setProperty("--c-primary-hover", accent.hover);
      root.style.setProperty("--c-sidebar-active", accent.hover);
    }
  }, [appearance.accentTheme, appearance.theme]);

  // Seed from the account's saved appearance on a fresh browser only.
  useEffect(() => {
    if (hasLocal || !isAuthenticated) return;
    const remote = user?.appearance_preferences;
    if (remote) {
      const merged = sanitize(typeof remote === "string" ? safeParse(remote) : remote);
      setAppearance(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }, [isAuthenticated, user, hasLocal]);

  const persist = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (isAuthenticated) {
      authService.updatePreferences({ appearance_preferences: next }).catch(() => {});
    }
  }, [isAuthenticated]);

  const update = useCallback((patch) => {
    setAppearance((prev) => {
      const next = sanitize({ ...prev, ...patch });
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    const next = { ...DEFAULT_APPEARANCE };
    setAppearance(next);
    persist(next);
  }, [persist]);

  // --- Widget management (Layout Manager + Visibility Manager) ---
  const toggleWidget = useCallback((id) => {
    setAppearance((prev) => {
      const hidden = prev.hiddenWidgets.includes(id)
        ? prev.hiddenWidgets.filter((w) => w !== id)
        : [...prev.hiddenWidgets, id];
      const next = sanitize({ ...prev, hiddenWidgets: hidden });
      persist(next);
      return next;
    });
  }, [persist]);

  const moveWidget = useCallback((id, direction) => {
    setAppearance((prev) => {
      const order = [...prev.widgetOrder];
      const i = order.indexOf(id);
      if (i === -1) return prev;
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= order.length) return prev;
      [order[i], order[j]] = [order[j], order[i]];
      const next = sanitize({ ...prev, widgetOrder: order });
      persist(next);
      return next;
    });
  }, [persist]);

  const setWidgetOrder = useCallback((order) => {
    setAppearance((prev) => {
      const next = sanitize({ ...prev, widgetOrder: order });
      persist(next);
      return next;
    });
  }, [persist]);

  const resetWidgets = useCallback(() => {
    setAppearance((prev) => {
      const next = sanitize({ ...prev, widgetOrder: DEFAULT_WIDGET_ORDER, hiddenWidgets: [] });
      persist(next);
      return next;
    });
  }, [persist]);

  // --- Preset management (saved combinations) ---
  const savePresets = useCallback((list) => {
    setPresets(list);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  }, []);

  const savePreset = useCallback((name) => {
    const preset = { id: `p_${Date.now()}`, name: name || "My dashboard", config: { ...appearance }, isDefault: false };
    savePresets([...presets, preset]);
  }, [appearance, presets, savePresets]);

  const applyPreset = useCallback((id) => {
    const p = presets.find((x) => x.id === id);
    if (p) {
      const next = sanitize(p.config);
      setAppearance(next);
      persist(next);
    }
  }, [presets, persist]);

  const renamePreset = useCallback((id, name) => {
    savePresets(presets.map((p) => (p.id === id ? { ...p, name } : p)));
  }, [presets, savePresets]);

  const deletePreset = useCallback((id) => {
    savePresets(presets.filter((p) => p.id !== id));
  }, [presets, savePresets]);

  const setDefaultPreset = useCallback((id) => {
    savePresets(presets.map((p) => ({ ...p, isDefault: p.id === id })));
  }, [presets, savePresets]);

  const value = useMemo(
    () => ({
      appearance, update, reset,
      toggleWidget, moveWidget, setWidgetOrder, resetWidgets,
      presets, savePreset, applyPreset, renamePreset, deletePreset, setDefaultPreset,
    }),
    [appearance, update, reset, toggleWidget, moveWidget, setWidgetOrder, resetWidgets, presets, savePreset, applyPreset, renamePreset, deletePreset, setDefaultPreset]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
