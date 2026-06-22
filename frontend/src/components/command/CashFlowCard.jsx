import { formatCurrency } from "../../utils/formatters";

// Cash Flow Intelligence card — renders only when a bank statement has been
// uploaded (data.cash_flow.available). All figures live from CashFlowService.

const TONE_CLASS = { good: "text-risk-low", bad: "text-risk-high", neutral: "text-ink" };

function Metric({ label, value, tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="truncate text-xs font-medium text-ink-muted">{label}</p>
      <p className={`figure mt-0.5 whitespace-nowrap text-lg font-bold ${tone || "text-ink"}`}>{value}</p>
    </div>
  );
}

function CashFlowCard({ cashFlow }) {
  if (!cashFlow || !cashFlow.available) return null;
  const s = cashFlow.summary || {};
  const spending = cashFlow.spending || [];
  const insights = cashFlow.insights || [];
  const runway = cashFlow.runway || {};
  const forecast = cashFlow.forecast || {};
  const netTone = s.net_cash_flow == null ? "text-ink" : s.net_cash_flow >= 0 ? "text-risk-low" : "text-risk-high";

  const maxSpend = spending.length ? Math.max(...spending.map((x) => x.amount)) : 0;
  const runwayTone = runway.status === "critical" ? "text-risk-high" : runway.status === "warning" ? "text-gold" : "text-risk-low";

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Cash flow</h2>
        {s.period_start && s.period_end && (
          <span className="text-xs text-ink-muted">{s.period_start} → {s.period_end}</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Cash position" value={s.cash_position == null ? "—" : formatCurrency(s.cash_position)} />
        <Metric label="Money in" value={formatCurrency(s.total_inflow || 0)} tone="text-risk-low" />
        <Metric label="Money out" value={formatCurrency(s.total_outflow || 0)} tone="text-gold" />
        <Metric label="Net cash flow" value={formatCurrency(s.net_cash_flow || 0)} tone={netTone} />
      </div>

      {/* Cash runway + stress detection */}
      {runway.available && (
        <div className={`mt-4 rounded-xl border px-4 py-3 ${runway.status === "critical" ? "border-risk-high/30 bg-risk-high/5" : runway.status === "warning" ? "border-gold/30 bg-gold/5" : "border-border bg-bg-subtle"}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Cash runway</p>
            <span className={`figure text-lg font-bold ${runwayTone}`}>
              {runway.runway_months == null ? "Healthy" : `${runway.runway_months} mo`}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{runway.detail}</p>
        </div>
      )}

      {/* Cash forecast */}
      {forecast.available && forecast.projection && forecast.projection.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cash forecast</p>
            {forecast.goes_negative && <span className="text-xs font-semibold text-risk-high">Projected to go negative</span>}
          </div>
          <div className="mt-2 space-y-1.5">
            {forecast.projection.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2 text-sm">
                <span className="text-ink-muted">{p.month}</span>
                <span className={`figure font-semibold ${p.projected_cash < 0 ? "text-risk-high" : "text-ink"}`}>{formatCurrency(p.projected_cash)}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">{forecast.basis}</p>
        </div>
      )}

      {spending.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Where cash went</p>
          <div className="mt-2 space-y-2">
            {spending.slice(0, 5).map((row, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate text-ink">{row.label}</span>
                  <span className="figure ml-3 shrink-0 font-semibold text-ink">{formatCurrency(row.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${maxSpend ? (row.amount / maxSpend) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank reconciliation — collection verification */}
      {cashFlow.reconciliation && cashFlow.reconciliation.available && (
        <div className="mt-4 rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Bank reconciliation</p>
            <span className="figure text-sm font-bold text-ink">{cashFlow.reconciliation.match_rate_pct}% matched</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {cashFlow.reconciliation.credits?.matched || 0} of {cashFlow.reconciliation.credits?.count || 0} deposits tied to invoices
            {cashFlow.reconciliation.credits?.unmatched_value > 0 && ` · ${formatCurrency(cashFlow.reconciliation.credits.unmatched_value)} unmatched`}
          </p>
          {(cashFlow.reconciliation.insights || []).slice(0, 1).map((ins, i) => (
            <p key={i} className={`mt-1.5 text-sm ${ins.tone === "bad" ? "text-risk-high" : ins.tone === "good" ? "text-risk-low" : "text-ink-muted"}`}>
              {ins.detail}
            </p>
          ))}
        </div>
      )}

      {insights.length > 0 && (
        <div className="mt-5 space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-bg-subtle px-4 py-2.5">
              <span className={`mt-0.5 text-sm font-bold ${TONE_CLASS[ins.tone] || "text-ink"}`}>
                {ins.tone === "good" ? "✓" : ins.tone === "bad" ? "!" : "•"}
              </span>
              <p className="min-w-0 text-sm">
                <span className="font-semibold text-ink">{ins.label}.</span>{" "}
                <span className="text-ink-muted">{ins.detail}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default CashFlowCard;
