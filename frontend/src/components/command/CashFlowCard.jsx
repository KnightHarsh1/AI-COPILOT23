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
  const netTone = s.net_cash_flow == null ? "text-ink" : s.net_cash_flow >= 0 ? "text-risk-low" : "text-risk-high";

  const maxSpend = spending.length ? Math.max(...spending.map((x) => x.amount)) : 0;

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
