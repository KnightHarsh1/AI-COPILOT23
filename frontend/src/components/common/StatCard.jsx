import { formatCurrency } from "../../utils/formatters";
import useCountUp from "../../hooks/useCountUp";

// Executive KPI card — premium presentation layer. Business-critical numbers are
// NEVER truncated or hidden; the full Indian-format value is always shown. Adds
// count-up animation, hover lift, a glow border, and a hover-revealed detail
// row (growth %, previous period). None of this touches the underlying value or
// any KPI calculation — it's purely how the same number is displayed.
function fontSizeForLength(text) {
  const len = String(text).length;
  if (len <= 9) return "text-3xl";
  if (len <= 12) return "text-2xl";
  if (len <= 15) return "text-xl";
  return "text-lg";
}

function StatCard({ label, value, isCurrency = true, trend, accent, icon, showNewBadge = true, animate = true }) {
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  const animated = useCountUp(numericValue, { enabled: animate && isCurrency && Math.abs(numericValue) > 0 });
  const shown = animate && isCurrency ? animated : numericValue;
  const display = isCurrency ? formatCurrency(Math.round(shown)) : String(value);
  const sizeClass = fontSizeForLength(isCurrency ? formatCurrency(numericValue) : String(value));

  return (
    <div className="group glow-hover shine relative flex flex-col justify-between overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card hover:border-primary/40">
      {/* Neon glow wash on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(var(--c-primary),0.12), transparent 70%)" }} />

      <div className="relative flex items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        )}
      </div>

      <p
        className={`figure relative mt-3 font-bold leading-tight ${sizeClass} ${accent || "text-ink"}`}
        style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
      >
        {display}
      </p>

      <div className="relative mt-2 min-h-[1.25rem]">
        {trend != null ? (
          <p className={`text-sm font-semibold ${trend >= 0 ? "text-risk-low" : "text-risk-high"}`}>
            <span className="inline-block transition-transform duration-300 group-hover:-translate-y-0.5">{trend >= 0 ? "▲" : "▼"}</span>{" "}
            {Math.abs(trend).toFixed(1)}% vs last period
          </p>
        ) : (
          showNewBadge && <p className="text-sm font-medium text-ink-muted">Awaiting comparison period</p>
        )}
      </div>
    </div>
  );
}

export default StatCard;
