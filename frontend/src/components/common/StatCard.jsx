import { formatCurrency } from "../../utils/formatters";

// Executive KPI card. Philosophy: business-critical numbers are NEVER
// truncated or hidden. The full Indian-format value (₹12,54,32,456) is
// always shown. Font size scales down by digit-length so long numbers
// stay fully visible without overflowing — readability over density.
function fontSizeForLength(text) {
  const len = String(text).length;
  if (len <= 9) return "text-3xl";      // ₹1,23,456
  if (len <= 12) return "text-2xl";     // ₹12,34,567
  if (len <= 15) return "text-xl";      // ₹12,54,32,456
  return "text-lg";                     // crore+ with paise
}

function StatCard({ label, value, isCurrency = true, trend, accent, icon, showNewBadge = true }) {
  const display = isCurrency ? formatCurrency(value) : String(value);
  const sizeClass = fontSizeForLength(display);

  return (
    <div className="flex flex-col justify-between rounded-card border border-border bg-surface p-6 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>

      {/* Full value, always visible, never truncated. Wraps only as a last
          resort on extreme widths; breaks on the grouping commas. */}
      <p
        className={`figure mt-3 font-bold leading-tight ${sizeClass} ${accent || "text-ink"}`}
        style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
      >
        {display}
      </p>

      {trend != null ? (
        <p className={`mt-2 text-sm font-semibold ${trend >= 0 ? "text-risk-low" : "text-risk-high"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs last period
        </p>
      ) : (
        showNewBadge && (
          <p className="mt-2 text-sm font-medium text-ink-muted">New · needs 2+ periods to trend</p>
        )
      )}
    </div>
  );
}

export default StatCard;
