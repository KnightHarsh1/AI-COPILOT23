import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatters";
import { LEVELS, LEVEL_BY_ID, classifyActions, sourceLabel } from "./attentionEngine";

// Daily Actions — the operational command center. Shows an AI summary, severity
// filter chips, and the alert cards for the selected level. Reuses the
// action-center data classified by attentionEngine; no duplicate logic.

function AiSummary({ result }) {
  const { counts, impactAtRisk, mostUrgent } = result;
  return (
    <section className="rounded-card border border-border bg-gradient-to-br from-surface to-bg-subtle/40 p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Daily AI Action Center</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">What needs your attention</h1>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LEVELS.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center">
            <p className={`figure text-xl font-bold ${l.text}`}>{counts[l.id]}</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{l.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {impactAtRisk > 0 && (
          <div className="rounded-xl bg-bg-subtle/60 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Potential financial impact</p>
            <p className="figure mt-0.5 text-lg font-bold text-risk-high">{formatCurrency(impactAtRisk)}</p>
          </div>
        )}
        {mostUrgent && (
          <div className="rounded-xl bg-bg-subtle/60 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Most urgent</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{mostUrgent.title}</p>
            {mostUrgent.recommended_action && <p className="mt-0.5 text-xs text-primary">→ {mostUrgent.recommended_action}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function AlertCard({ item }) {
  const lvl = LEVEL_BY_ID[item.level];
  return (
    <div className={`rounded-card border ${lvl.ring} bg-surface p-5 shadow-card transition hover:shadow-lg`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">{item.title}</h3>
        <span className={`shrink-0 rounded-pill ${lvl.soft} px-2.5 py-0.5 text-[11px] font-bold ${lvl.text}`}>
          {lvl.emoji} {lvl.label}
        </span>
      </div>
      {item.reason && <p className="mt-2 text-sm text-ink-muted">{item.reason}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {item.expected_impact && (
          <div className="rounded-xl bg-bg-subtle/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Business impact</p>
            <p className="mt-0.5 text-sm text-ink">{item.expected_impact}</p>
          </div>
        )}
        {item.recommended_action && (
          <div className="rounded-xl bg-bg-subtle/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Recommended action</p>
            <p className="mt-0.5 text-sm text-ink">{item.recommended_action}</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-ink-muted">Source: {sourceLabel(item.category)}</p>
    </div>
  );
}

function EmptyLevel({ level }) {
  const lvl = LEVEL_BY_ID[level];
  const copy = {
    critical: { t: "No critical issues detected", s: "Your business currently has no critical attention items." },
    action: { t: "Nothing needs action right now", s: "No action-required issues at the moment." },
    watch: { t: "Nothing on your watchlist", s: "No emerging trends to monitor right now." },
    normal: { t: "No items here", s: "Check the other attention levels." },
  }[level];
  return (
    <div className="rounded-card border border-risk-low/20 bg-risk-low/5 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-risk-low/15 text-2xl">✓</div>
      <p className="mt-3 font-display text-lg font-semibold text-ink">{copy.t}</p>
      <p className="mt-1 text-sm text-ink-muted">{copy.s}</p>
    </div>
  );
}

function DailyActionsPanel({ actionCenter, initialLevel = "all" }) {
  const [level, setLevel] = useState(initialLevel);
  useEffect(() => { setLevel(initialLevel); }, [initialLevel]);

  const result = classifyActions(actionCenter);
  const { buckets, counts } = result;

  const visible = level === "all"
    ? [...buckets.critical, ...buckets.action, ...buckets.watch, ...buckets.normal]
    : buckets[level];

  const chips = [
    ...LEVELS.map((l) => ({ id: l.id, label: l.label, emoji: l.emoji, count: counts[l.id], text: l.text, soft: l.soft })),
    { id: "all", label: "All", emoji: "", count: counts.all, text: "text-ink", soft: "bg-bg-subtle" },
  ];

  return (
    <div className="space-y-5">
      <AiSummary result={result} />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const active = level === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setLevel(c.id)}
              className={`rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition ${
                active ? `${c.soft} ${c.text} border-current` : "border-border text-ink-muted hover:bg-bg-subtle"
              }`}
            >
              {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.label} ({c.count})
            </button>
          );
        })}
      </div>

      {/* Cards or empty state */}
      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((item, i) => <AlertCard key={i} item={item} />)}
        </div>
      ) : (
        <EmptyLevel level={level === "all" ? "critical" : level} />
      )}

      {/* See other levels */}
      {level !== "all" && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <span className="text-sm text-ink-muted">Showing {LEVEL_BY_ID[level]?.label || "All"}.</span>
          {LEVELS.filter((l) => l.id !== level).map((l) => (
            <button key={l.id} type="button" onClick={() => setLevel(l.id)} className="text-sm font-semibold text-primary hover:underline">
              View {l.label}
            </button>
          ))}
          <button type="button" onClick={() => setLevel("all")} className="text-sm font-semibold text-primary hover:underline">View All</button>
        </div>
      )}
    </div>
  );
}

export default DailyActionsPanel;
