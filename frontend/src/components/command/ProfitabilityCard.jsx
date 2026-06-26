import { formatCurrency } from "../../utils/formatters";
import SourceBadge from "../common/SourceBadge";
import { ExplainTooltip } from "../common/ExplainTooltip";
import TrustFooter from "./TrustFooter";
import HealthImpactBadge from "./HealthImpactBadge";
import { MarginWaterfall } from "./IntelVisualizations";

// Profitability Intelligence widget — renders only when a P&L statement has
// been uploaded (data.profitability.available). All figures live from
// ProfitLossService.

const TONE_CLASS = { good: "text-risk-low", bad: "text-risk-high", neutral: "text-ink" };

function Metric({ label, value, sub, tone, explain }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-muted">{label}
        {explain && <ExplainTooltip title={explain.title || label} hint={explain.hint} detail={explain.detail} />}
      </p>
      <p className={`figure mt-0.5 whitespace-nowrap text-lg font-bold ${tone || "text-ink"}`}>{value}</p>
      {sub != null && <p className="mt-0.5 text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

function pct(v) {
  return v == null ? "—" : `${Number(v).toFixed(1)}%`;
}

function ProfitabilityCard({ profitability, healthImpact }) {
  if (!profitability || !profitability.available) return null;
  const k = profitability.kpis || {};
  const insights = profitability.insights || [];

  const nmTone = k.net_margin == null ? "text-ink" : k.net_margin >= 10 ? "text-risk-low" : k.net_margin >= 5 ? "text-gold" : "text-risk-high";
  const npTone = k.net_profit == null ? "text-ink" : k.net_profit >= 0 ? "text-risk-low" : "text-risk-high";

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card lift hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Profitability (P&amp;L)</h2>
          <SourceBadge source="P&L Statement" updated={k.statement_date} confidence={96} />
        </div>
        {k.statement_date && <span className="text-xs text-ink-muted">As of {k.statement_date}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Revenue" value={formatCurrency(k.revenue || 0)} />
        <Metric label="Gross profit" value={formatCurrency(k.gross_profit || 0)} sub={`${pct(k.gross_margin)} margin`} />
        <Metric label="Operating profit" value={formatCurrency(k.operating_profit || 0)} sub={`${pct(k.operating_margin)} margin`} />
        <Metric label="EBITDA" value={formatCurrency(k.ebitda || 0)} sub={`${pct(k.ebitda_margin)} margin`} />
        <Metric label="Net profit" value={formatCurrency(k.net_profit || 0)} tone={npTone} />
        <Metric label="Net margin" value={pct(k.net_margin)} tone={nmTone} sub="≥10% is healthy" />
        <Metric label="Contribution margin" value={k.contribution_margin != null ? formatCurrency(k.contribution_margin) : "—"} sub={k.contribution_margin_ratio != null ? `${k.contribution_margin_ratio}% ratio` : undefined}
          explain={{ title: "Contribution Margin", hint: "Revenue left after variable costs (gross profit proxy).", detail: { formula: "revenue − variable/COGS (≈ gross profit)", sources: ["P&L"], confidence: 70 } }} />
        <Metric label="Break-even revenue" value={k.break_even_revenue != null ? formatCurrency(k.break_even_revenue) : "—"} sub="revenue to cover fixed costs"
          explain={{ title: "Break-even Revenue", hint: "Sales needed to cover fixed costs.", detail: { formula: "fixed costs / contribution-margin ratio", sources: ["P&L"], confidence: 65 } }} />
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
      <div className="mt-4">
        <MarginWaterfall revenue={k.revenue} grossProfit={k.gross_profit} operatingProfit={k.operating_profit} netProfit={k.net_profit} />
      </div>

      <HealthImpactBadge points={healthImpact} />
      <TrustFooter
        sources={["P&L Statement"]}
        confidence={96}
        lastUpdated={k.statement_date || "Latest statement"}
        explanation="Profitability metrics are computed directly from your uploaded Profit & Loss statement."
        warning={k.net_profit != null && k.net_profit < 0 ? "Business is currently loss-making" : undefined}
      />
    </section>
  );
}

export default ProfitabilityCard;
