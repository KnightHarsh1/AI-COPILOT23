import { formatCurrency } from "../../utils/formatters";

// Profitability Intelligence widget — renders only when a P&L statement has
// been uploaded (data.profitability.available). All figures live from
// ProfitLossService.

const TONE_CLASS = { good: "text-risk-low", bad: "text-risk-high", neutral: "text-ink" };

function Metric({ label, value, sub, tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="truncate text-xs font-medium text-ink-muted">{label}</p>
      <p className={`figure mt-0.5 whitespace-nowrap text-lg font-bold ${tone || "text-ink"}`}>{value}</p>
      {sub != null && <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

function pct(v) {
  return v == null ? "—" : `${Number(v).toFixed(1)}%`;
}

function ProfitabilityCard({ profitability }) {
  if (!profitability || !profitability.available) return null;
  const k = profitability.kpis || {};
  const insights = profitability.insights || [];

  const nmTone = k.net_margin == null ? "text-ink" : k.net_margin >= 10 ? "text-risk-low" : k.net_margin >= 5 ? "text-gold" : "text-risk-high";
  const npTone = k.net_profit == null ? "text-ink" : k.net_profit >= 0 ? "text-risk-low" : "text-risk-high";

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Profitability (P&amp;L)</h2>
        {k.statement_date && <span className="text-xs text-ink-muted">As of {k.statement_date}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Revenue" value={formatCurrency(k.revenue || 0)} />
        <Metric label="Gross profit" value={formatCurrency(k.gross_profit || 0)} sub={`${pct(k.gross_margin)} margin`} />
        <Metric label="Operating profit" value={formatCurrency(k.operating_profit || 0)} sub={`${pct(k.operating_margin)} margin`} />
        <Metric label="EBITDA" value={formatCurrency(k.ebitda || 0)} sub={`${pct(k.ebitda_margin)} margin`} />
        <Metric label="Net profit" value={formatCurrency(k.net_profit || 0)} tone={npTone} />
        <Metric label="Net margin" value={pct(k.net_margin)} tone={nmTone} sub="≥10% is healthy" />
        <Metric label="Profitability score" value={k.profitability_score == null ? "—" : `${Math.round(k.profitability_score)}/100`} />
      </div>

      {insights.length > 0 && (
        <div className="mt-4 space-y-2">
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

export default ProfitabilityCard;
