import { formatCurrency, formatCurrencyCompact, formatNumber } from "../../utils/formatters";

// SmartValue — renders a metric on a single line, never wrapping. Large numbers
// are shown compactly (₹2.3L, ₹1.25Cr) with the full value available on hover
// (native title tooltip). Small numbers keep their full form. Health-score-style
// "77/100" strings and other non-numeric values render as-is, single-line.
//
// Usage:
//   <SmartValue value={230045} currency />                  → ₹2.3L (title ₹2,30,045)
//   <SmartValue value={77} suffix="/100" currency={false} /> → 77/100
//   <SmartValue value="77/100" />                            → 77/100 (raw)
function SmartValue({ value, currency = true, suffix = "", compactThreshold = 100000, className = "" }) {
  // Non-numeric (already-formatted) strings: render verbatim, single line.
  const numeric = typeof value === "number" ? value : Number(value);
  if (value == null || Number.isNaN(numeric)) {
    return <span className={`figure-value ${className}`} title={value != null ? String(value) : undefined}>{value != null ? String(value) : "—"}</span>;
  }

  const full = currency ? formatCurrency(numeric) : formatNumber(numeric);
  const fullWithSuffix = `${full}${suffix}`;
  const abs = Math.abs(numeric);
  const useCompact = abs >= compactThreshold;
  const shown = useCompact
    ? `${currency ? formatCurrencyCompact(numeric) : formatNumber(numeric)}${suffix}`
    : fullWithSuffix;

  return (
    <span className={`figure-value ${className}`} title={fullWithSuffix}>
      {shown}
    </span>
  );
}

export default SmartValue;
