import { useState } from "react";
import { Reorder, motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useAppearance, ACCENT_THEMES, THEMES, THEME_CATEGORIES, FONTS, DASHBOARD_WIDGETS } from "../../context/AppearanceContext";

// Full customization panel. All controls are presentation-only — they write to
// the appearance preferences (persisted per user) and re-skin the UI via CSS
// variables and data attributes. No business logic, APIs, or calculations are
// touched.

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

const HEALTH_WIDGET_OPTS = [
  { value: "classic", label: "Classic" },
  { value: "ring", label: "Circular Ring" },
  { value: "credit", label: "Executive Card" },
  { value: "gauge", label: "Speedometer Gauge" },
  { value: "orb", label: "AI CFO Status" },
];
const DENSITY_OPTS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];
const SIDEBAR_OPTS = [
  { value: "expanded", label: "Expanded" },
  { value: "compact", label: "Compact" },
  { value: "auto", label: "Auto Collapse" },
];
const ROTATION_OPTS = [
  { value: 5000, label: "5s" },
  { value: 7000, label: "7s" },
  { value: 10000, label: "10s" },
  { value: 15000, label: "15s" },
  { value: 0, label: "Off" },
];

function WidgetManager() {
  const { appearance, toggleWidget, setWidgetOrder, resetWidgets } = useAppearance();
  const order = appearance.widgetOrder || [];
  const hidden = new Set(appearance.hiddenWidgets || []);
  const byId = DASHBOARD_WIDGETS.reduce((m, w) => ((m[w.id] = w), m), {});

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-muted">Drag to reorder; toggle to show or hide.</p>
      <Reorder.Group axis="y" values={order} onReorder={setWidgetOrder} className="space-y-2">
        {order.map((id) => {
          const w = byId[id];
          if (!w) return null;
          const isHidden = hidden.has(id);
          return (
            <Reorder.Item
              key={id}
              value={id}
              className="flex cursor-grab items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 active:cursor-grabbing"
              whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
            >
              <GripVertical size={16} className="shrink-0 text-ink-muted" />
              <span className={`flex-1 text-sm font-medium ${isHidden ? "text-ink-muted line-through" : "text-ink"}`}>{w.label}</span>
              <button
                type="button"
                onClick={() => toggleWidget(id)}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition ${isHidden ? "bg-bg-subtle text-ink-muted hover:text-ink" : "bg-primary/10 text-primary"}`}
              >
                {isHidden ? "Hidden" : "Shown"}
              </button>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      <button type="button" onClick={resetWidgets} className="mt-1 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition hover:bg-bg-subtle">
        Restore default widgets
      </button>
    </div>
  );
}

// Miniature dashboard preview rendered in the chosen theme's colours. Shows a
// sidebar, navbar, KPI cards, a chart, and a health ring so the user sees the
// full effect before committing. Pure visual; uses the theme's own var values.
function ThemePreview({ theme }) {
  if (!theme) return null;
  const v = theme.vars;
  const c = (k, fb) => (v[k] ? `rgb(${v[k]})` : fb);
  const bg = theme.bgGradient ? { backgroundImage: theme.bgGradient } : { background: c("--c-bg") };
  const sideInk = v["--c-sidebar-ink"] ? `rgb(${v["--c-sidebar-ink"]})` : "rgb(226 232 245)";
  return (
    <div className="overflow-hidden rounded-xl border border-border" style={bg}>
      <div className="flex h-[148px]">
        {/* Sidebar */}
        <div className="w-[28%] p-2" style={{ background: c("--c-sidebar-bg") }}>
          <div className="mb-2 h-2 w-3/4 rounded" style={{ background: c("--c-primary") }} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mb-1.5 h-1.5 w-full rounded" style={{ background: i === 0 ? c("--c-primary") : sideInk, opacity: i === 0 ? 1 : 0.35 }} />
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-2.5">
          {/* Navbar */}
          <div className="mb-2 flex items-center justify-between">
            <div className="h-1.5 w-12 rounded" style={{ background: c("--c-ink"), opacity: 0.7 }} />
            <div className="h-3 w-3 rounded-full" style={{ background: c("--c-primary") }} />
          </div>
          {/* KPI cards */}
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded p-1.5" style={{ background: c("--c-surface"), border: `1px solid ${c("--c-border")}` }}>
                <div className="h-1 w-2/3 rounded" style={{ background: c("--c-ink-muted") }} />
                <div className="mt-1 h-1.5 w-full rounded" style={{ background: c("--c-primary") }} />
              </div>
            ))}
          </div>
          {/* Chart + health */}
          <div className="flex gap-1.5">
            <div className="flex h-[44px] flex-1 items-end gap-1 rounded p-1.5" style={{ background: c("--c-surface"), border: `1px solid ${c("--c-border")}` }}>
              {[40, 65, 50, 80, 60].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: c("--c-primary"), opacity: 0.7 + i * 0.05 }} />
              ))}
            </div>
            <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full" style={{ border: `3px solid ${c("--c-primary")}`, background: c("--c-surface") }}>
              <div className="h-1 w-3 rounded" style={{ background: c("--c-ink"), opacity: 0.7 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { appearance, update, reset, presets, savePreset, applyPreset, deletePreset, setDefaultPreset } = useAppearance();
  const [presetName, setPresetName] = useState("");
  const [preview, setPreview] = useState(null);
  const a = appearance;
  const previewTheme = THEMES.find((t) => t.id === (preview || a.theme));

  return (
    <div className="space-y-7">
      {/* Live preview thumbnail */}
      <Row label="Live preview" hint="Hover any theme below to preview it here.">
        <ThemePreview theme={previewTheme} />
      </Row>

      {/* Theme palette — grouped by category, each a rich card */}
      <Row label="Theme" hint="Re-skins the entire interface — backgrounds, cards, borders, navigation, charts, and badges.">
        <div className="space-y-5">
          {THEME_CATEGORIES.map((cat) => {
            const items = THEMES.filter((t) => t.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{cat.label}</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {items.map((t) => {
                    const selected = a.theme === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        onClick={() => update({ theme: t.id })}
                        onMouseEnter={() => setPreview(t.id)}
                        onMouseLeave={() => setPreview(null)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative overflow-hidden rounded-xl border-2 p-3 text-left transition ${selected ? "border-primary shadow-card" : "border-border hover:border-primary/40"}`}
                      >
                        {/* Mini palette preview band */}
                        <div className="flex h-10 overflow-hidden rounded-lg" style={t.bgGradient ? { backgroundImage: t.bgGradient } : { background: `rgb(${t.vars["--c-bg"]})` }}>
                          <span className="m-auto flex gap-1">
                            <span className="h-5 w-5 rounded" style={{ background: `rgb(${t.vars["--c-surface"]})` }} />
                            <span className="h-5 w-5 rounded" style={{ background: `rgb(${t.vars["--c-primary"]})` }} />
                            <span className="h-5 w-5 rounded" style={{ background: `rgb(${t.vars["--c-primary-hover"]})` }} />
                            {t.vars["--c-gold"] && <span className="h-5 w-5 rounded" style={{ background: `rgb(${t.vars["--c-gold"]})` }} />}
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{t.label}</span>
                          {t.badge && (
                            <span className={`rounded-pill px-2 py-0.5 text-[9px] font-bold tracking-wide ${t.badge === "PREMIUM" ? "bg-gold/15 text-gold" : "bg-primary/15 text-primary"}`}>{t.badge}</span>
                          )}
                          {selected && <span className="ml-auto text-xs font-bold text-primary">✓</span>}
                        </div>
                        {t.description && <p className="mt-0.5 text-xs text-ink-muted">{t.description}</p>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Row>

      {/* Accent colour squares */}
      <Row label="Accent colour" hint="The highlight colour for buttons, links, and active states.">
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
                className={`relative h-10 w-12 rounded-lg border-2 transition ${selected ? "border-ink scale-105" : "border-border hover:scale-105"}`}
                style={{ background: shade.swatch }}
              >
                {selected && <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow">✓</span>}
              </button>
            );
          })}
        </div>
      </Row>

      {/* Font selector */}
      <Row label="Font">
        <div className="flex flex-wrap gap-2">
          {FONTS.map((f) => {
            const selected = a.fontFamily === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => update({ fontFamily: f.id })}
                className={`rounded-pill border px-4 py-2 text-sm font-semibold transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-ink-muted hover:text-ink"}`}
                style={{ fontFamily: f.stack }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Row>

      {/* Health widget style */}
      <Row label="Business health widget" hint="Choose how the health score is presented. Uses your existing score — no calculation changes.">
        <Chips value={a.healthStyle} onChange={(v) => update({ healthStyle: v })} options={HEALTH_WIDGET_OPTS} />
      </Row>

      {/* Density + Sidebar */}
      <Row label="Dashboard density"><Chips value={a.density} onChange={(v) => update({ density: v })} options={DENSITY_OPTS} /></Row>
      <Row label="Sidebar mode" hint="Expanded shows labels; Compact shows icons; Auto collapses on smaller screens."><Chips value={a.sidebarMode} onChange={(v) => update({ sidebarMode: v })} options={SIDEBAR_OPTS} /></Row>

      {/* Carousel auto-rotate speed */}
      <Row label="Hero carousel auto-rotate" hint="How fast the Executive Brief / AI CFO / Business Attention hero rotates.">
        <Chips value={a.carouselRotationMs} onChange={(v) => update({ carouselRotationMs: v })} options={ROTATION_OPTS} />
      </Row>

      {/* Widget Manager */}
      <Row label="Dashboard widgets" hint="Show, hide, and reorder the Today dashboard sections.">
        <WidgetManager />
      </Row>

      {/* Saved layouts */}
      <Row label="Saved layouts">
        <div className="flex flex-wrap gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Name this layout"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={() => { if (presetName.trim()) { savePreset(presetName.trim()); setPresetName(""); } }} className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            Save current
          </button>
        </div>
        {presets.length > 0 && (
          <ul className="mt-3 space-y-2">
            {presets.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.name}{p.isDefault && <span className="ml-2 text-xs text-primary">· default</span>}</span>
                <button type="button" onClick={() => applyPreset(p.id)} className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-ink hover:bg-surface">Restore</button>
                <button type="button" onClick={() => setDefaultPreset(p.id)} className="rounded-pill border border-border px-3 py-1 text-xs text-ink-muted hover:bg-surface">Set default</button>
                <button type="button" onClick={() => deletePreset(p.id)} className="rounded-pill border border-risk-high/30 px-3 py-1 text-xs text-risk-high hover:bg-risk-high/10">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Row>

      <div className="border-t border-border pt-4">
        <button type="button" onClick={reset} className="rounded-pill border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-bg-subtle">
          Reset all to default
        </button>
      </div>
    </div>
  );
}

export default AppearanceSettings;
