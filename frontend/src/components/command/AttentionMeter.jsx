import { formatCurrency } from "../../utils/formatters";
import { LEVELS, LEVEL_BY_ID, classifyActions } from "./attentionEngine";

// Business Attention Meter — answers "what deserves my attention right now?"
// Sits on the Today tab below the AI CFO briefing. Shows an overall status,
// the impact at risk, and a count per severity level. Each level's View button
// deep-links to the Daily Actions tab filtered to that level.

function AttentionMeter({ actionCenter, onView }) {
  const { counts, overall, impactAtRisk } = classifyActions(actionCenter);
  const overallLevel = LEVEL_BY_ID[overall];

  const reasonMap = {
    critical: `${counts.critical} critical issue${counts.critical === 1 ? "" : "s"} need immediate attention.`,
    action: `${counts.action} action-required issue${counts.action === 1 ? "" : "s"} detected.`,
    watch: `${counts.watch} item${counts.watch === 1 ? "" : "s"} worth keeping an eye on.`,
    normal: "Your business is running smoothly.",
  };

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-ink">Business attention</h2>

      {/* Overall status banner */}
      <div className={`mt-3 rounded-xl border ${overallLevel.ring} ${overallLevel.soft} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Overall status</p>
            <p className={`mt-0.5 text-lg font-bold ${overallLevel.text}`}>
              {overallLevel.emoji} {overallLevel.label}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{reasonMap[overall]}</p>
          </div>
          {impactAtRisk > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">At risk</p>
              <p className="figure text-xl font-bold text-risk-high">{formatCurrency(impactAtRisk)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Per-level rows */}
      <div className="mt-4 space-y-2">
        {LEVELS.map((lvl) => {
          const count = counts[lvl.id];
          return (
            <div key={lvl.id} className={`flex items-center justify-between rounded-xl border border-border px-4 py-3 transition ${count > 0 ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${lvl.dot}`} />
                <span className="text-sm font-medium text-ink">{lvl.label}</span>
                <span className="figure rounded-pill bg-bg-subtle px-2 py-0.5 text-xs font-bold text-ink-muted">{count}</span>
              </div>
              <button
                type="button"
                onClick={() => onView(lvl.id)}
                disabled={count === 0}
                className="rounded-pill border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                View
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AttentionMeter;
