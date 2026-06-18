function TrendBadge({ trend }) {
  if (trend === null || trend === undefined || Number.isNaN(trend)) return null;
  const isUp = trend >= 0;
  return (
    <span
      className={`figure inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold ${
        isUp ? 'bg-risk-low/10 text-risk-low' : 'bg-risk-high/10 text-risk-high'
      }`}
    >
      {isUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

function DashboardCard({ title, value, caption, trend, children, className = '' }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-6 shadow-card transition hover:shadow-card-hover ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{title}</p>
          <p className="figure mt-3 truncate text-3xl font-semibold text-ink">{value}</p>
        </div>
        {children}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <TrendBadge trend={trend} />
        {caption && <p className="text-sm leading-6 text-ink-muted">{caption}</p>}
      </div>
    </div>
  );
}

export default DashboardCard;
