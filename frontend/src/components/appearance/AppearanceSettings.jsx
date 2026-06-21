import { useState } from "react";
import { useAppearance } from "../../context/AppearanceContext";
import { THEME_LABELS } from "./resolveAppearance";
import HealthScore from "./HealthScore";

function Chips({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-pill px-3.5 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "bg-primary text-white" : "bg-bg-subtle text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      {children}
    </div>
  );
}

const THEME_OPTS = Object.entries(THEME_LABELS).map(([value, label]) => ({ value, label }));
const KPI_OPTS = [
  { value: "classic", label: "Classic" }, { value: "sparklines", label: "Sparklines" },
  { value: "glass", label: "Glass" }, { value: "executive", label: "Executive" }, { value: "command", label: "AI Command" },
];
const CHART_OPTS = [
  { value: "classic", label: "Current chart" }, { value: "gradientArea", label: "Gradient area" },
  { value: "stacked", label: "Revenue vs expense" }, { value: "executiveTrend", label: "Executive trend" },
  { value: "forecast", label: "Forecast" }, { value: "waterfall", label: "Waterfall" },
];
const HEALTH_STYLE_OPTS = [
  { value: "classic", label: "Classic badge" }, { value: "ring", label: "AI ring" },
  { value: "gauge", label: "Executive gauge" }, { value: "shield", label: "Shield score" },
  { value: "orb", label: "AI orb" }, { value: "credit", label: "Credit card" },
];
const SKIN_OPTS = [
  { value: "classic", label: "Classic" }, { value: "neon", label: "Neon glow" },
  { value: "glass", label: "Glassmorphism" }, { value: "gradient", label: "Gradient premium" },
  { value: "cyberpunk", label: "Cyberpunk" }, { value: "gold", label: "Executive gold" },
];
const INSIGHTS_OPTS = [
  { value: "classic", label: "Classic" }, { value: "cards", label: "Cards" },
  { value: "executive", label: "Executive summary" }, { value: "chat", label: "Chat style" }, { value: "command", label: "AI command" },
];
const ALERTS_OPTS = [
  { value: "classic", label: "Classic" }, { value: "timeline", label: "Timeline" },
  { value: "priority", label: "Priority board" }, { value: "matrix", label: "Risk matrix" }, { value: "feed", label: "AI feed" },
];
const RECO_OPTS = [
  { value: "classic", label: "Classic" }, { value: "cards", label: "Cards" },
  { value: "advisor", label: "AI advisor" }, { value: "actionPlan", label: "CFO action plan" },
];
const DENSITY_OPTS = [
  { value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" },
  { value: "executive", label: "Executive" }, { value: "dataHeavy", label: "Data heavy" },
];
const ANIM_OPTS = [
  { value: "off", label: "Off" }, { value: "minimal", label: "Minimal" },
  { value: "standard", label: "Standard" }, { value: "premium", label: "Premium" },
];
const LAYOUT_OPTS = [
  { value: "standard", label: "Standard grid" }, { value: "executive", label: "Executive grid" },
  { value: "analytics", label: "Analytics grid" }, { value: "command", label: "AI command grid" },
];

function AppearanceSettings() {
  const { appearance, update, reset, presets, savePreset, applyPreset, renamePreset, deletePreset, setDefaultPreset } = useAppearance();
  const [presetName, setPresetName] = useState("");
  const a = appearance;
  const previewScore = 72;

  return (
    <div className="space-y-5">
      {/* Live health preview */}
      <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-bg-subtle p-4">
        <HealthScore score={previewScore} style={a.healthStyle} skin={a.healthSkin} />
        <p className="text-xs text-ink-muted">Live preview · updates as you change the style and skin below.</p>
      </div>

      {/* Dashboard theme (presets) */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Dashboard theme</p>
        <Chips value={a.dashboardTheme} onChange={(v) => update({ dashboardTheme: v })} options={THEME_OPTS} />
        <p className="mt-2 text-xs text-ink-muted">Presets set everything at once. Classic is the default and looks exactly like before.</p>
      </div>

      {/* Custom mode toggle */}
      <Row label="Custom dashboard">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={a.customMode} onChange={(e) => update({ customMode: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--c-primary))]" />
          <span className="text-sm text-ink-muted">Enable custom mode to mix individual components instead of a preset.</span>
        </label>
      </Row>

      {/* Custom component pickers — only when custom mode is on */}
      {a.customMode && (
        <div className="space-y-4 rounded-card border border-primary/20 bg-primary/5 p-4">
          <Row label="KPI card style"><Chips value={a.kpiStyle} onChange={(v) => update({ kpiStyle: v })} options={KPI_OPTS} /></Row>
          <Row label="Main chart"><Chips value={a.mainChart} onChange={(v) => update({ mainChart: v })} options={CHART_OPTS} /></Row>
          <Row label="AI insights panel"><Chips value={a.insightsStyle} onChange={(v) => update({ insightsStyle: v })} options={INSIGHTS_OPTS} /></Row>
          <Row label="Alerts panel"><Chips value={a.alertsStyle} onChange={(v) => update({ alertsStyle: v })} options={ALERTS_OPTS} /></Row>
          <Row label="Recommendations panel"><Chips value={a.recommendationsStyle} onChange={(v) => update({ recommendationsStyle: v })} options={RECO_OPTS} /></Row>
          <Row label="Layout mode"><Chips value={a.layoutMode} onChange={(v) => update({ layoutMode: v })} options={LAYOUT_OPTS} /></Row>
        </div>
      )}

      {/* Health score style + skin (always available) */}
      <Row label="Health score style"><Chips value={a.healthStyle} onChange={(v) => update({ healthStyle: v })} options={HEALTH_STYLE_OPTS} /></Row>
      <Row label="Health badge skin"><Chips value={a.healthSkin} onChange={(v) => update({ healthSkin: v })} options={SKIN_OPTS} /></Row>

      {/* Global feel */}
      <Row label="Density"><Chips value={a.density} onChange={(v) => update({ density: v })} options={DENSITY_OPTS} /></Row>
      <Row label="Animations"><Chips value={a.animationLevel} onChange={(v) => update({ animationLevel: v })} options={ANIM_OPTS} /></Row>

      {/* Presets */}
      <Row label="My saved dashboards">
        <div className="flex flex-wrap gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Name this setup (e.g. My CFO dashboard)"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => { if (presetName.trim()) { savePreset(presetName.trim()); setPresetName(""); } }}
            className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Save current
          </button>
        </div>
        {presets.length > 0 && (
          <ul className="mt-3 space-y-2">
            {presets.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {p.name}{p.isDefault && <span className="ml-2 text-xs text-primary">· default</span>}
                </span>
                <button type="button" onClick={() => applyPreset(p.id)} className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-ink hover:bg-surface">Apply</button>
                <button type="button" onClick={() => setDefaultPreset(p.id)} className="rounded-pill border border-border px-3 py-1 text-xs text-ink-muted hover:bg-surface">Set default</button>
                <button type="button" onClick={() => { const n = prompt("Rename dashboard", p.name); if (n) renamePreset(p.id, n); }} className="rounded-pill border border-border px-3 py-1 text-xs text-ink-muted hover:bg-surface">Rename</button>
                <button type="button" onClick={() => deletePreset(p.id)} className="rounded-pill border border-risk-high/30 px-3 py-1 text-xs text-risk-high hover:bg-risk-high/10">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Row>

      {/* Reset */}
      <div className="border-t border-border pt-4">
        <button type="button" onClick={reset} className="rounded-pill border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-bg-subtle">
          Reset to default
        </button>
      </div>
    </div>
  );
}

export default AppearanceSettings;
