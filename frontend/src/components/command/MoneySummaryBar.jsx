import { formatCurrency } from "../../utils/formatters";
import { classifyActions } from "./attentionEngine";

// Money Summary Bar — three executive money figures directly below the KPI
// cards: Money at Risk (from attention classification), Money to Recover
// (outstanding receivables), and Growth Opportunity (opportunity engine total).
// Reuses existing data — no new calculations.

function Tile({ icon, label, value, tone, ring }) {
  return (
    <div className={`flex-1 rounded-card border ${ring} p-5`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      </div>
      <p className={`figure mt-2 text-2xl font-bold ${tone}`}>{formatCurrency(value || 0)}</p>
    </div>
  );
}

function MoneySummaryBar({ actionCenter, collections, opportunities }) {
  const atRisk = classifyActions(actionCenter).impactAtRisk || 0;
  const toRecover = (collections && collections.available && collections.outstanding_receivables) || 0;
  const growth = (opportunities && opportunities.available && opportunities.total_value) || 0;

  // If we have nothing meaningful on any of the three, don't render the bar.
  if (atRisk <= 0 && toRecover <= 0 && growth <= 0) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Tile icon="⚠" label="Money at risk" value={atRisk} tone="text-risk-high" ring="border-risk-high/25 bg-risk-high/5" />
      <Tile icon="💰" label="Money to recover" value={toRecover} tone="text-risk-low" ring="border-risk-low/25 bg-risk-low/5" />
      <Tile icon="🚀" label="Growth opportunity" value={growth} tone="text-primary" ring="border-primary/25 bg-primary/5" />
    </div>
  );
}

export default MoneySummaryBar;
