// HealthImpactBadge — shows how many points a module contributes to the overall
// Business Health Score. Value comes from the backend health_impact map; when a
// module isn't eligible (no data) nothing renders.
function HealthImpactBadge({ points }) {
  if (points == null) return null;
  const positive = points >= 0;
  const tone = positive ? "bg-risk-low/10 text-risk-low" : "bg-risk-high/10 text-risk-high";
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Impact on Business Health</span>
      <span className={`figure-value rounded-pill px-2.5 py-0.5 text-xs font-bold ${tone}`}>
        {positive ? "+" : ""}{points} points
      </span>
    </div>
  );
}

export default HealthImpactBadge;
