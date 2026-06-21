import { useState } from "react";

const PRIORITY_STYLES = {
  high: "bg-risk-high/10 text-risk-high",
  medium: "bg-risk-medium/10 text-risk-medium",
  low: "bg-risk-low/10 text-risk-low",
};

const CATEGORY_ICONS = {
  collections: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  compliance: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  inventory_risk: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  customer_risk: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  general: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
};

function ActionCard({ action }) {
  const [open, setOpen] = useState(false);
  const iconPath = CATEGORY_ICONS[action.category] || CATEGORY_ICONS.general;

  return (
    <div className="rounded-xl border border-border bg-surface transition hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.low}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d={iconPath} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink break-words">{action.title}</span>
          <span className={`mt-0.5 inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.low}`}>
            {action.priority}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Why</p>
            <p className="mt-0.5 text-ink">{action.reason}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Expected impact</p>
            <p className="mt-0.5 text-ink">{action.expected_impact}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Recommended action</p>
            <p className="mt-0.5 text-ink">{action.recommended_action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const HORIZONS = [
  { key: "today", label: "Today's Priorities" },
  { key: "week", label: "Weekly Goals" },
  { key: "month", label: "Monthly Focus" },
];

function ActionCenter({ actionCenter }) {
  const [horizon, setHorizon] = useState("today");
  const data = actionCenter || { today: [], week: [], month: [] };
  const actions = data[horizon] || [];

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What to do next</p>
          <h2 className="font-display mt-1 text-xl font-bold text-ink">Daily AI Action Center</h2>
        </div>
        <div className="inline-flex rounded-pill bg-bg-subtle p-1">
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => setHorizon(h.key)}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition ${
                horizon === h.key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {actions.length === 0 ? (
        <p className="rounded-xl bg-bg-subtle px-4 py-6 text-center text-sm text-ink-muted">
          Nothing in this list right now. Check the other time horizons or import fresh data.
        </p>
      ) : (
        <div className="space-y-3">
          {actions.map((action, i) => (
            <ActionCard key={`${horizon}-${i}`} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ActionCenter;
