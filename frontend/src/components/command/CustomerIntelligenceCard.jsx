import { formatCurrency } from "../../utils/formatters";
import { ExplainTooltip } from "../common/ExplainTooltip";
import TrustFooter from "./TrustFooter";
import HealthImpactBadge from "./HealthImpactBadge";
import { RFMScatter } from "./IntelVisualizations";

// Customer Intelligence widget — renders only when customer-attributed sales
// exist (data.customers.available). All figures live from
// CustomerIntelligenceService.

function HealthRing({ score }) {
  const v = Math.max(0, Math.min(100, Math.round(score || 0)));
  const tone = v >= 70 ? "#22c55e" : v >= 45 ? "#f59e0b" : "#ef4444";
  const size = 76, st = 8, r = (size - st) / 2, c = 2 * Math.PI * r, off = c - (v / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border))" strokeWidth={st} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={st} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 700ms ease" }} />
      </svg>
      <span className="figure absolute inset-0 flex items-center justify-center text-xl font-bold text-ink">{v}</span>
    </div>
  );
}

const DEP_TONE = { high: "text-risk-high bg-risk-high/10", medium: "text-gold bg-gold/10", low: "text-risk-low bg-risk-low/10" };

function AlertChip({ label, count, tone }) {
  const cls = count > 0 ? (tone || "bg-bg-subtle text-ink") : "bg-bg-subtle text-ink-muted";
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${cls}`}>
      <p className="figure text-lg font-bold leading-none">{count}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight">{label}</p>
    </div>
  );
}

function CustomerList({ title, rows, valueFmt, emptyText }) {
  if (!rows || rows.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{emptyText}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{c.name}</span>
            <span className="figure ml-2 shrink-0 font-semibold text-ink">{valueFmt(c)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustomerIntelligenceCard({ customers, healthImpact }) {
  if (!customers || !customers.available) return null;
  const d = customers;
  const alerts = d.alerts || {};
  const dep = d.dependency_risk || {};
  const conc = d.concentration || {};
  const maxRev = d.top_customers?.length ? Math.max(...d.top_customers.map((c) => c.revenue)) : 0;

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card lift hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Customer Intelligence</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{d.customer_count} customers · {formatCurrency(d.total_revenue)} tracked</p>
        </div>
        <div className="flex items-center gap-3">
          <HealthRing score={d.customer_health_score} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Customer health</p>
            <p className="text-sm font-bold text-ink">{d.customer_health_score}/100</p>
          </div>
        </div>
      </div>

      {/* Customer Alerts Meter */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <AlertChip label="Overdue" count={alerts.overdue?.count || 0} tone="bg-risk-high/10 text-risk-high" />
        <AlertChip label="Declining" count={alerts.declining?.count || 0} tone="bg-gold/10 text-gold" />
        <AlertChip label="Lost" count={alerts.lost?.count || 0} tone="bg-risk-high/10 text-risk-high" />
        <AlertChip label="High dep." count={alerts.high_dependency?.count || 0} tone="bg-risk-high/10 text-risk-high" />
        <AlertChip label="Growing" count={alerts.fast_growing?.count || 0} tone="bg-risk-low/10 text-risk-low" />
        <AlertChip label="Credit risk" count={alerts.credit_risk?.count || 0} tone="bg-gold/10 text-gold" />
      </div>

      {/* Concentration meter */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Customer concentration</span>
          <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${DEP_TONE[dep.level] || "bg-bg-subtle text-ink"}`}>
            {dep.level === "high" ? "High risk" : dep.level === "medium" ? "Moderate" : "Well spread"}
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
          <div className={`h-full rounded-full ${conc.top_customer_pct >= 50 ? "bg-risk-high" : conc.top_customer_pct >= 30 ? "bg-gold" : "bg-risk-low"}`} style={{ width: `${Math.min(conc.top_customer_pct || 0, 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">{dep.detail} Top 3 customers: {conc.top3_pct}% of revenue.</p>
      </div>

      {/* Top customers */}
      {d.top_customers?.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Top customers</p>
          <div className="mt-2 space-y-2">
            {d.top_customers.slice(0, 5).map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate text-ink">{c.name} <span className="text-ink-muted">· {c.share_pct}%</span></span>
                  <span className="figure ml-2 shrink-0 font-semibold text-ink">{formatCurrency(c.revenue)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${maxRev ? (c.revenue / maxRev) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Growth / churn columns */}
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <CustomerList
          title="Fast growing"
          rows={d.fast_growing}
          valueFmt={(c) => `+${c.growth_pct}%`}
          emptyText="No standout growth yet."
        />
        <CustomerList
          title="Declining"
          rows={d.declining}
          valueFmt={(c) => `${c.growth_pct}%`}
          emptyText="No declining customers."
        />
        <CustomerList
          title="New customers"
          rows={d.new_customers}
          valueFmt={(c) => formatCurrency(c.revenue)}
          emptyText="No new customers in 90 days."
        />
      </div>

      {/* Repeat + LTV + segments */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 text-xs text-ink-muted">Repeat rate
            <ExplainTooltip title="Repeat Purchase Rate" hint="Share of customers who bought more than once." detail={{ formula: "repeat customers / total customers × 100", sources: ["Sales"], confidence: 80 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{d.repeat_analysis?.repeat_rate_pct}%</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 text-xs text-ink-muted">Avg lifetime value
            <ExplainTooltip title="Customer Lifetime Value" hint="Average revenue per customer to date." detail={{ formula: "total revenue / customer count", sources: ["Sales"], confidence: 70 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(d.avg_lifetime_value || 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 text-xs text-ink-muted">Churn risk
            <ExplainTooltip title="Churn Risk" hint="Customers idle 60–119 days (slipping away)." detail={{ formula: "count of customers idle 60–119 days", sources: ["Sales"], confidence: 65 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{d.churn_risk?.count ?? 0}<span className="text-xs text-ink-muted"> ({d.churn_risk?.pct ?? 0}%)</span></p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="text-xs text-ink-muted">Champions</p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{d.rfm_segments?.Champions ?? 0}</p>
        </div>
      </div>

      {/* RFM segments */}
      {d.rfm_segments && (
        <div className="mt-4">
          <RFMScatter rfm={d.rfm_segments} />
        </div>
      )}

      <HealthImpactBadge points={healthImpact} />
      <TrustFooter
        sources={["Sales Register"]}
        confidence={Math.round(d.customer_health_score || 0) >= 70 ? 78 : 60}
        lastUpdated={d.last_updated || "Latest import"}
        explanation="Customer KPIs (CLV, RFM, churn, repeat rate) are computed from customer-attributed sales history."
        warning={d.churn_risk?.count > 0 ? `${d.churn_risk.count} customer(s) at churn risk` : undefined}
      />
    </section>
  );
}

export default CustomerIntelligenceCard;
