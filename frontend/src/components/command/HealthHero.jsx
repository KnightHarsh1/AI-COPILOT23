import ScoreGauge from "../common/charts/ScoreGauge";
import { formatCurrency } from "../../utils/formatters";

const COMPONENT_LABELS = {
  revenue_growth_score: "Revenue growth",
  profitability_score: "Profitability",
  inventory_health_score: "Inventory",
  customer_risk_score: "Customers",
  liquidity_solvency_score: "Liquidity",
};

const COMPONENT_MAX = {
  revenue_growth_score: 30,
  profitability_score: 30,
  inventory_health_score: 20,
  customer_risk_score: 20,
  liquidity_solvency_score: 20,
};

function Metric({ label, value, trend, accent }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`figure mt-2 text-2xl font-bold ${accent || "text-ink"}`}>{value}</p>
      {trend != null && (
        <p className={`mt-1 text-xs font-semibold ${trend >= 0 ? "text-risk-low" : "text-risk-high"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs prior period
        </p>
      )}
    </div>
  );
}

function HealthHero({ health }) {
  const h = health || {};
  const components = h.components || {};
  const unavailable = new Set((h.components_unavailable || []).map((c) => c.component));

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Master health gauge */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Business health</p>
        <div className="mt-3 flex items-center gap-5">
          <ScoreGauge score={h.health_score || 0} size={132} />
          <div className="flex-1 space-y-2">
            {Object.keys(COMPONENT_MAX).map((key) => {
              const isUnavailable = unavailable.has(key);
              const raw = components[key];
              const pct = isUnavailable || raw == null ? 0 : Math.round((raw / COMPONENT_MAX[key]) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">{COMPONENT_LABELS[key]}</span>
                    <span className={isUnavailable ? "text-ink-muted" : "font-semibold text-ink"}>
                      {isUnavailable ? "—" : `${pct}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: isUnavailable ? "0%" : `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {h.data_completeness != null && (
          <p className="mt-4 text-xs text-ink-muted">
            Based on {Math.round(h.data_completeness)}% of possible data.{" "}
            {h.data_completeness < 100 && "Import more to sharpen the score."}
          </p>
        )}
      </div>

      {/* Key financial metrics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenue (30d)" value={formatCurrency(h.revenue)} trend={h.growth_rate} />
        <Metric
          label="Net profit (30d)"
          value={formatCurrency(h.net_profit)}
          accent={h.net_profit >= 0 ? "text-risk-low" : "text-risk-high"}
        />
        <Metric label="Receivables" value={h.outstanding_receivables != null ? formatCurrency(h.outstanding_receivables) : "—"} />
        <Metric label="Expenses (30d)" value={formatCurrency(h.expenses)} />
      </div>
    </section>
  );
}

export default HealthHero;
