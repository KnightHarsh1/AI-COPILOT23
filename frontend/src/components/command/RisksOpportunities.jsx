// Risks vs Opportunities — a two-column executive view built from the Daily AI
// Action Center. Left column = risks (things to defend against), right column =
// opportunities (things to capture). Each card explains why, the impact, and
// the suggested action. Purely a re-presentation of action_center data, so it
// stays in sync automatically.

const RISK_CATS = new Set(["collections", "liquidity_risk", "working_capital", "debt_risk", "cash_flow_risk", "customer_risk", "profitability", "market_risk", "inventory_risk", "reconciliation", "compliance"]);
const OPP_CATS = new Set(["opportunity", "market_opportunity"]);

const PRIORITY_DOT = { high: "bg-risk-high", medium: "bg-gold", low: "bg-ink-muted" };

function Card({ item, side }) {
  const accent = side === "risk" ? "border-risk-high/15" : "border-risk-low/15";
  return (
    <div className={`rounded-xl border ${accent} bg-bg-subtle/40 p-4 transition hover:shadow-card`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[item.priority] || "bg-ink-muted"}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{item.title}</p>
          <p className="mt-1 text-xs text-ink-muted">{item.reason}</p>
          {item.expected_impact && (
            <p className="mt-1.5 text-xs"><span className="font-medium text-ink">Impact:</span> <span className="text-ink-muted">{item.expected_impact}</span></p>
          )}
          {item.recommended_action && (
            <p className="mt-1 text-xs text-primary">→ {item.recommended_action}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ title, items, side, emptyText }) {
  const headTone = side === "risk" ? "text-risk-high" : "text-risk-low";
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className={`font-display text-base font-semibold ${headTone}`}>{title}</h3>
        <span className="rounded-pill bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-ink-muted">{items.length}</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {items.length > 0 ? (
          items.slice(0, 5).map((it, i) => <Card key={i} item={it} side={side} />)
        ) : (
          <p className="rounded-xl bg-bg-subtle/40 px-4 py-6 text-center text-sm text-ink-muted">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function RisksOpportunities({ actionCenter }) {
  if (!actionCenter) return null;
  const all = [...(actionCenter.today || []), ...(actionCenter.week || []), ...(actionCenter.month || [])];
  const risks = all.filter((a) => RISK_CATS.has(a.category));
  const opps = all.filter((a) => OPP_CATS.has(a.category));

  // If there's genuinely nothing on either side, don't render an empty shell.
  if (risks.length === 0 && opps.length === 0) return null;

  return (
    <section>
      <h2 className="font-display mb-3 text-lg font-semibold text-ink">Risks &amp; opportunities</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Column title="Risks to manage" items={risks} side="risk" emptyText="No pressing risks right now." />
        <Column title="Opportunities to capture" items={opps} side="opp" emptyText="Upload more data to surface opportunities." />
      </div>
    </section>
  );
}

export default RisksOpportunities;
