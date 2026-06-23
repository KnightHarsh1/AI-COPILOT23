import { formatCurrency } from "../../utils/formatters";

// Opportunity Intelligence widget — aggregates money-quantified opportunities
// across all engines. Renders only when opportunities exist
// (data.opportunities.available).

const CAT_STYLE = {
  customer: { label: "Customer", cls: "bg-primary/10 text-primary" },
  product: { label: "Product", cls: "bg-gold/10 text-gold" },
  collections: { label: "Collections", cls: "bg-risk-low/10 text-risk-low" },
  cost: { label: "Cost", cls: "bg-risk-high/10 text-risk-high" },
  growth: { label: "Growth", cls: "bg-primary/10 text-primary" },
  expansion: { label: "Expansion", cls: "bg-primary/10 text-primary" },
};

function OpportunityCard({ opportunities }) {
  if (!opportunities || !opportunities.available) return null;
  const d = opportunities;

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card lift hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Opportunity Intelligence</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{d.opportunity_count} opportunities found across your data</p>
        </div>
        {d.total_value > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Total potential</p>
            <p className="figure text-xl font-bold text-risk-low">{formatCurrency(d.total_value)}</p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {d.opportunities.map((o, i) => {
          const cat = CAT_STYLE[o.category] || { label: o.category, cls: "bg-bg-subtle text-ink-muted" };
          return (
            <div key={i} className="rounded-xl border border-border bg-bg-subtle/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${cat.cls}`}>{cat.label}</span>
                    {o.potential && <span className="text-[11px] font-medium text-ink-muted">{o.potential}</span>}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink">{o.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{o.detail}</p>
                  <p className="mt-1.5 text-sm text-primary">→ {o.recommended_action}</p>
                </div>
                {o.value != null && o.value > 0 && (
                  <span className="figure shrink-0 text-sm font-bold text-ink">{formatCurrency(o.value)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default OpportunityCard;
