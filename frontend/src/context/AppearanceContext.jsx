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
  { id: "violet",   label: "Violet",      primary: "139 92 246",  hover: "167 139 250", swatch: "rgb(139 92 246)" },
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

export const DEFAULT_APPEARANCE = {
  dashboardTheme: "classic",      // classic | modern | executive | finance | command
  accentTheme: "indigo",          // accent colour shade (see ACCENT_THEMES)
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
  }, [appearance.density, appearance.animationLevel]);

  // Apply the chosen accent shade by overriding the primary CSS variables.
  // Falls back to the default indigo when an unknown id is stored.
  useEffect(() => {
    const root = document.documentElement;
    const accent = ACCENT_BY_ID[appearance.accentTheme] || ACCENT_BY_ID.indigo;
    if (accent) {
      root.style.setProperty("--c-primary", accent.primary);
      root.style.setProperty("--c-primary-hover", accent.hover);
      root.style.setProperty("--c-sidebar-active", accent.hover);
    }
  }, [appearance.accentTheme]);

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
      presets, savePreset, applyPreset, renamePreset, deletePreset, setDefaultPreset,
    }),
    [appearance, update, reset, presets, savePreset, applyPreset, renamePreset, deletePreset, setDefaultPreset]
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
