import { formatCurrency } from "../../utils/formatters";

// Import Impact Report — shows the measured business impact of an import:
// KPI deltas, health-score change, GST liability, and counts of new alerts /
// actions / opportunities. Rendered after a successful import and re-viewable
// from import history. Degrades gracefully if no impact was captured.

function Delta({ change }) {
  const up = change.delta > 0;
  const arrow = up ? "▲" : "▼";
  const toneCls = change.tone === "good" ? "text-risk-low" : "text-risk-high";
  const fmt = (v) => (change.is_percent ? `${v.toFixed(1)}%` : formatCurrency(v));
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-card">
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{change.label}</p>
        <p className="figure mt-0.5 text-base font-bold text-ink">{fmt(change.after)}</p>
      </div>
      <span className={`figure shrink-0 text-sm font-semibold ${toneCls}`}>
        {arrow} {fmt(Math.abs(change.delta))}
      </span>
    </div>
  );
}

function CountPill({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${tone}`}>
      <p className="figure text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  );
}

function ImportImpactReport({ impact }) {
  if (!impact) return null;
  const changes = impact.metric_changes || [];
  const health = impact.health_score;
  const gst = impact.gst_liability;
  const hasHealth = health && (health.before != null || health.after != null);

  return (
    <div className="space-y-4 rounded-card border border-border bg-bg-subtle/40 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink">What changed</h3>
        {impact.records_imported > 0 && (
          <span className="text-xs text-ink-muted">{impact.records_imported} records imported</span>
        )}
      </div>

      {/* Headline counts */}
      <div className="grid grid-cols-3 gap-2">
        <CountPill label="New alerts" value={impact.new_alerts || 0} tone={impact.new_alerts > 0 ? "bg-risk-high/10 text-risk-high" : "bg-surface text-ink-muted"} />
        <CountPill label="New actions" value={impact.new_actions || 0} tone={impact.new_actions > 0 ? "bg-primary/10 text-primary" : "bg-surface text-ink-muted"} />
        <CountPill label="Opportunities" value={impact.new_opportunities || 0} tone={impact.new_opportunities > 0 ? "bg-risk-low/10 text-risk-low" : "bg-surface text-ink-muted"} />
      </div>

      {/* Health score change */}
      {hasHealth && health.delta !== 0 && (
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-card">
          <p className="text-sm font-semibold text-ink">Business health score</p>
          <p className="figure text-sm font-bold">
            <span className="text-ink-muted">{health.before ?? "—"}</span>
            <span className="mx-1.5 text-ink-muted">→</span>
            <span className={health.delta > 0 ? "text-risk-low" : "text-risk-high"}>{health.after ?? "—"}</span>
          </p>
        </div>
      )}

      {/* Metric deltas */}
      {changes.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {changes.map((c) => <Delta key={c.metric} change={c} />)}
        </div>
      )}

      {/* GST liability */}
      {gst && gst.after > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-card">
          <p className="text-sm font-semibold text-ink">GST liability</p>
          <p className="figure text-sm font-bold text-ink">{formatCurrency(gst.after)}</p>
        </div>
      )}

      {changes.length === 0 && !hasHealth && (
        <p className="text-sm text-ink-muted">
          This import was stored. No headline metric changed — it may add detail (like customers or line items) that powers other intelligence.
        </p>
      )}
    </div>
  );
}

export default ImportImpactReport;
