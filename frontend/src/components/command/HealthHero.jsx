import ScoreGauge from "../common/charts/ScoreGauge";
import StatCard from "../common/StatCard";

const COMPONENT_LABELS = {
  revenue_growth_score: "Revenue health",
  profitability_score: "Profit health",
  liquidity_solvency_score: "Cash flow health",
  inventory_health_score: "Inventory health",
  customer_risk_score: "Customer health",
};

const COMPONENT_MAX = {
  revenue_growth_score: 30,
  profitability_score: 30,
  liquidity_solvency_score: 20,
  inventory_health_score: 20,
  customer_risk_score: 20,
};

function HealthHero({ health, healthStyle }) {
  const h = health || {};
  const components = h.components || {};
  const unavailable = new Set((h.components_unavailable || []).map((c) => c.component));

  return (
    <section className="space-y-5">
      {/* PRIMARY: the executive numbers an SME owner wants first. Six cards:
          Revenue, Net Profit, Receivables, Cash Position, Working Capital,
          Expenses. 1-up on phones, 2-up on tablets, 3-up on desktop. */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenue (30d)"
          value={h.revenue}
          trend={h.growth_rate}
          icon={<IconRupee />}
          sparkColor="rgb(var(--c-primary))"
          sparkUp={(h.growth_rate ?? 1) >= 0}
          seed={2}
        />
        <StatCard
          label="Net profit (30d)"
          value={h.net_profit}
          accent={h.net_profit >= 0 ? "text-risk-low" : "text-risk-high"}
          icon={<IconTrend />}
          sparkColor="rgb(var(--c-risk-low))"
          sparkUp={(h.net_profit ?? 0) >= 0}
          seed={5}
        />
        <StatCard
          label="Receivables"
          value={h.outstanding_receivables != null ? h.outstanding_receivables : 0}
          icon={<IconClock />}
          showNewBadge={false}
          sparkColor="rgb(var(--c-gold))"
          sparkUp
          seed={8}
        />
        <StatCard
          label="Cash position"
          value={h.cash_position != null ? h.cash_position : 0}
          icon={<IconCash />}
          showNewBadge={false}
          sparkColor="rgb(var(--c-primary))"
          sparkUp
          seed={11}
        />
        <StatCard
          label="Working capital"
          value={h.working_capital != null ? h.working_capital : 0}
          accent={h.working_capital != null && h.working_capital < 0 ? "text-risk-high" : undefined}
          icon={<IconScale />}
          showNewBadge={false}
          sparkColor="rgb(var(--c-primary))"
          sparkUp={(h.working_capital ?? 0) >= 0}
          seed={14}
        />
        <StatCard
          label="Expenses (30d)"
          value={h.expenses}
          icon={<IconCard />}
          showNewBadge={false}
          sparkColor="rgb(var(--c-gold))"
          sparkUp={false}
          seed={17}
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
                    <span className={isUnavailable ? "text-xs text-ink-muted" : "font-semibold text-ink"}>
                      {isUnavailable ? "No data yet" : `${pct}%`}
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
        {(() => {
          // Derive top strength + biggest weakness from available pillars.
          const avail = Object.keys(COMPONENT_MAX)
            .filter((k) => !unavailable.has(k) && components[k] != null)
            .map((k) => ({ key: k, pct: Math.round((components[k] / COMPONENT_MAX[k]) * 100) }));
          if (avail.length === 0) return null;
          const sorted = avail.slice().sort((a, b) => b.pct - a.pct);
          const strength = sorted[0];
          const weakness = sorted[sorted.length - 1];
          const confidence = h.data_completeness != null ? Math.round(h.data_completeness) : null;
          return (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-risk-low/5 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-risk-low">Top strength</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{COMPONENT_LABELS[strength.key]}</p>
              </div>
              <div className="rounded-xl bg-risk-high/5 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-risk-high">Biggest weakness</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{COMPONENT_LABELS[weakness.key]}</p>
              </div>
              {confidence != null && (
                <div className="rounded-xl bg-bg-subtle px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Confidence</p>
                  <p className="figure mt-0.5 text-sm font-semibold text-ink">{confidence}%</p>
                </div>
              )}
            </div>
          );
        })()}
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

function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 3v18M5 7h14M5 7l-3 7h6l-3-7zM19 7l-3 7h6l-3-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default HealthHero;
