import { formatCurrency } from "../../utils/formatters";
import SourceBadge from "../common/SourceBadge";

// Shows balance-sheet KPIs + insights on the Command Center. Renders only when
// a balance sheet has been uploaded (data.balance_sheet.available). All values
// are live from the dedicated balance-sheet pipeline — never fabricated.

function Metric({ label, value, sub, tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="truncate text-xs font-medium text-ink-muted">{label}</p>
      <p className={`figure mt-0.5 whitespace-nowrap text-lg font-bold ${tone || "text-ink"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

const TONE_CLASS = { good: "text-risk-low", bad: "text-risk-high", neutral: "text-ink" };

function ratio(v) {
  return v == null ? "—" : `${Number(v).toFixed(2)}×`;
}

function BalanceSheetCard({ balanceSheet }) {
  if (!balanceSheet || !balanceSheet.available) return null;
  const k = balanceSheet.kpis || {};
  const insights = balanceSheet.insights || [];

  const crTone = k.current_ratio == null ? "text-ink" : k.current_ratio >= 1.5 ? "text-risk-low" : k.current_ratio >= 1 ? "text-gold" : "text-risk-high";
  const wcTone = k.working_capital == null ? "text-ink" : k.working_capital >= 0 ? "text-risk-low" : "text-risk-high";
  const drTone = k.debt_ratio == null ? "text-ink" : k.debt_ratio <= 0.4 ? "text-risk-low" : k.debt_ratio <= 0.6 ? "text-gold" : "text-risk-high";

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card lift hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Financial position</h2>
          <SourceBadge source="Balance Sheet" updated={k.statement_date} confidence={97} />
        </div>
        {k.statement_date && <span className="text-xs text-ink-muted">As of {k.statement_date}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Cash position" value={formatCurrency(k.cash_position || 0)} tone="text-ink" />
        <Metric label="Working capital" value={formatCurrency(k.working_capital || 0)} tone={wcTone} />
        <Metric label="Net worth" value={formatCurrency(k.net_worth || 0)} tone="text-ink" />
        <Metric label="Current ratio" value={ratio(k.current_ratio)} sub="≥1.5 is healthy" tone={crTone} />
        <Metric label="Quick ratio" value={ratio(k.quick_ratio)} sub="excl. inventory" tone="text-ink" />
        <Metric label="Debt ratio" value={k.debt_ratio == null ? "—" : `${Math.round(k.debt_ratio * 100)}%`} sub="of assets" tone={drTone} />
        <Metric label="Liquidity" value={k.liquidity_score == null ? "—" : `${Math.round(k.liquidity_score)}/100`} tone="text-ink" />
        <Metric label="Financial strength" value={k.financial_strength_score == null ? "—" : `${Math.round(k.financial_strength_score)}/100`} tone="text-ink" />
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

export default BalanceSheetCard;
