import { useState } from "react";
import { useAppearance } from "../../context/AppearanceContext";
import { ACCENT_THEMES } from "../../context/AppearanceContext";

// Appearance settings, simplified. The dashboard-theme / health-style / skin
// pickers have been removed in favour of a single, friendly choice: an accent
// colour shade. Ten curated shades are shown as small colour squares the user
// taps to select. Density, animations, and saved presets remain.

function Row({ label, children, hint }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      {children}
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function Chips({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
            value === o.value ? "bg-primary text-white shadow-card" : "bg-bg-subtle text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const DENSITY_OPTS = [
  { value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" },
  { value: "executive", label: "Executive" }, { value: "dataHeavy", label: "Data heavy" },
];
const ANIM_OPTS = [
  { value: "off", label: "Off" }, { value: "minimal", label: "Minimal" },
  { value: "standard", label: "Standard" }, { value: "premium", label: "Premium" },
];

function AppearanceSettings() {
  const { appearance, update, reset, presets, savePreset, applyPreset, renamePreset, deletePreset, setDefaultPreset } = useAppearance();
  const [presetName, setPresetName] = useState("");
  const a = appearance;

  return (
    <div className="space-y-6">
      {/* Accent colour — 10 shades shown as selectable squares */}
      <Row label="Accent colour" hint="Sets the highlight colour used across buttons, links, and active states. Indigo is the default.">
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_THEMES.map((shade) => {
            const selected = a.accentTheme === shade.id;
            return (
              <button
                key={shade.id}
                type="button"
                onClick={() => update({ accentTheme: shade.id })}
                title={shade.label}
                aria-label={shade.label}
                className={`relative h-10 w-12 rounded-lg border-2 transition ${
                  selected ? "border-ink scale-105" : "border-border hover:scale-105"
                }`}
                style={{ background: shade.swatch }}
              >
                {selected && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow">✓</span>
                )}
                {shade.id === "indigo" && !selected && (
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-ink-muted">Default</span>
                )}
              </button>
            );
          })}
        </div>
      </Row>

      {/* Global feel */}
      <Row label="Density"><Chips value={a.density} onChange={(v) => update({ density: v })} options={DENSITY_OPTS} /></Row>
      <Row label="Animations"><Chips value={a.animationLevel} onChange={(v) => update({ animationLevel: v })} options={ANIM_OPTS} /></Row>

      {/* Presets */}
      <Row label="My saved appearances">
        <div className="flex flex-wrap gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Name this setup"
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
