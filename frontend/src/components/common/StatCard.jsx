import { formatCurrency, formatCurrencyCompact } from "../../utils/formatters";
import useCountUp from "../../hooks/useCountUp";
import Sparkline from "./Sparkline";
import { ExplainTooltip } from "./ExplainTooltip";

// Executive KPI card — premium presentation layer. The value renders on a SINGLE
// line and never wraps or clips mid-number: large amounts compact to ₹2.3L /
// ₹1.25Cr with the full Indian-format value on hover, smaller amounts show in
// full. Count-up, hover lift, glow border, trend row, and sparkline are pure
// presentation — no KPI calculation is touched.
function fontSizeForLength(text) {
  const len = String(text).length;
  if (len <= 8) return "text-3xl";
  if (len <= 11) return "text-2xl";
  if (len <= 14) return "text-xl";
  return "text-lg";
}

// Compact when the full currency string is long enough to risk wrapping.
const COMPACT_AT = 100000; // ₹1L+

function StatCard({
  label, value, isCurrency = true, trend, accent, icon,
  showNewBadge = true, animate = true,
  sparkData, sparkColor = "rgb(var(--c-primary))", sparkUp = true, seed = 1,
  explain,
}) {
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  const useCompact = isCurrency && Math.abs(numericValue) >= COMPACT_AT;
  const animated = useCountUp(numericValue, { enabled: animate && isCurrency && Math.abs(numericValue) > 0 });
  const shown = animate && isCurrency ? animated : numericValue;
  // Display: compact for large currency (with full value as title), else full.
  const fullValue = isCurrency ? formatCurrency(numericValue) : String(value);
  const display = isCurrency
    ? (useCompact ? formatCurrencyCompact(Math.round(shown)) : formatCurrency(Math.round(shown)))
    : String(value);
  const sizeClass = fontSizeForLength(display);

  const labelEl = (
    <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
  );

  return (
    <div className="group glow-hover shine relative isolate flex flex-col justify-between overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card hover:border-primary/40" style={{ contain: "paint" }}>
      {/* Neon glow wash on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(var(--c-primary),0.12), transparent 70%)" }} />

      <div className="relative flex items-center justify-between gap-2">
        {explain ? (
          <ExplainTooltip title={explain.title || label} hint={explain.hint} detail={explain.detail || explain}>
            {labelEl}
          </ExplainTooltip>
        ) : labelEl}
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        )}
      </div>

      {/* Value + sparkline row — the value ALWAYS takes priority and is never
          clipped; the sparkline yields space and hides on cramped widths. */}
      <div className="relative mt-3 flex items-end gap-3">
        <p
          className={`figure-value flex-1 font-bold leading-tight ${sizeClass} ${accent || "text-ink"}`}
          title={fullValue}
        >
          {display}
        </p>
        <div className="hidden shrink-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100 sm:block">
          <Sparkline data={sparkData} color={sparkColor} up={sparkUp} seed={seed} width={80} height={32} />
        </div>
      </div>

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
