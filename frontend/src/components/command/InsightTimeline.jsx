import { LEVEL_BY_ID, classifyActions, sourceLabel } from "./attentionEngine";

// AI Insight Timeline — an executive intelligence feed presenting alerts,
// recommendations, opportunities, and AI CFO insights as a chronological,
// animated timeline. Pure presentation over existing action-center + insights
// data; no new intelligence is generated.

const HORIZON_LABEL = { today: "Today", week: "This week", month: "This month" };

function dot(level) {
  const l = LEVEL_BY_ID[level];
  return l ? l.dot : "bg-ink-muted";
}

function TimelineItem({ item, last }) {
  const lvl = LEVEL_BY_ID[item.level];
  return (
    <div className="relative flex gap-4 pb-6">
      {/* Rail */}
      {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-border" />}
      <span className={`relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-surface ${dot(item.level)}`} />
      <div className="min-w-0 flex-1 rounded-xl border border-border bg-bg-subtle/50 p-4 transition hover:border-primary/30 hover:shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{item.title}</p>
          <span className="flex items-center gap-2">
            {lvl && <span className={`rounded-pill ${lvl.soft} px-2 py-0.5 text-[10px] font-bold ${lvl.text}`}>{lvl.label}</span>}
            <span className="rounded-pill bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-ink-muted">{HORIZON_LABEL[item.horizon] || "Soon"}</span>
          </span>
        </div>
        {item.reason && <p className="mt-1 text-xs text-ink-muted">{item.reason}</p>}
        {item.recommended_action && <p className="mt-1.5 text-xs text-primary">→ {item.recommended_action}</p>}
        <p className="mt-2 text-[10px] uppercase tracking-wide text-ink-muted">{sourceLabel(item.category)}</p>
      </div>
    </div>
  );
}

function InsightTimeline({ actionCenter }) {
  const { all } = classifyActions(actionCenter);
  // Order by horizon (today → week → month), then by severity already applied
  // upstream. This gives a natural chronological reading order.
  const horizonRank = { today: 0, week: 1, month: 2 };
  const items = all.slice().sort((a, b) => (horizonRank[a.horizon] ?? 3) - (horizonRank[b.horizon] ?? 3));

  if (items.length === 0) {
    return (
      <section className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">✦</div>
        <p className="mt-3 font-display text-lg font-semibold text-ink">No insights yet</p>
        <p className="mt-1 text-sm text-ink-muted">Import more data to build your intelligence timeline.</p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="mb-5">
        <h2 className="font-display text-lg font-semibold text-ink">AI insight timeline</h2>
        <p className="text-sm text-ink-muted">Your alerts, recommendations, and opportunities in priority order.</p>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} className="enter-up" style={{ "--delay": `${Math.min(i, 8) * 60}ms` }}>
            <TimelineItem item={it} last={i === items.length - 1} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default InsightTimeline;
