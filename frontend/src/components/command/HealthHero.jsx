import ScoreGauge from "../common/charts/ScoreGauge";
import StatCard from "../common/StatCard";

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

function HealthHero({ health }) {
  const h = health || {};
  const components = h.components || {};
  const unavailable = new Set((h.components_unavailable || []).map((c) => c.component));

  return (
    <section className="space-y-5">
      {/* PRIMARY: the four numbers an SME owner wants first — full width,
          wide cards, complete values, never truncated. 1-up on phones,
          2-up on tablets, 4-up only on desktop where each card is roomy. */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={h.revenue}
          trend={h.growth_rate}
          icon={<IconRupee />}
        />
        <StatCard
          label="Net profit (30d)"
          value={h.net_profit}
          accent={h.net_profit >= 0 ? "text-risk-low" : "text-risk-high"}
          icon={<IconTrend />}
        />
        <StatCard
          label="Receivables"
          value={h.outstanding_receivables != null ? h.outstanding_receivables : 0}
          icon={<IconClock />}
        />
        <StatCard
          label="Expenses (30d)"
          value={h.expenses}
          icon={<IconCard />}
        />
      </div>

      {/* SECONDARY: business health gauge + component breakdown, full width. */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Business health</p>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex shrink-0 items-center gap-5">
            <ScoreGauge score={h.health_score || 0} size={132} />
          </div>
          <div className="grid flex-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {Object.keys(COMPONENT_MAX).map((key) => {
              const isUnavailable = unavailable.has(key);
              const raw = components[key];
              const pct = isUnavailable || raw == null ? 0 : Math.round((raw / COMPONENT_MAX[key]) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{COMPONENT_LABELS[key]}</span>
                    <span className={isUnavailable ? "text-ink-muted" : "font-semibold text-ink"}>
                      {isUnavailable ? "—" : `${pct}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
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
    </section>
  );
}

// Small inline icons (no external dep) for the KPI cards.
function IconRupee() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 8v4l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M2 7h20M2 7v10a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1zM6 15h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default HealthHero;
