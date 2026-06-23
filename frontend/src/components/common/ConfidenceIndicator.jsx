import { formatConfidencePct, confidenceTier } from "../../utils/formatters";

// ConfidenceIndicator — a compact, colour-coded confidence signal. Green/amber/
// red dot + percentage, derived from the same normalising helpers used across
// the app. Presentation only.
function ConfidenceIndicator({ value, showLabel = true, size = "sm" }) {
  if (value == null) return null;
  const pct = formatConfidencePct(value);
  const tier = confidenceTier(pct); // emoji 🟢/🟡/🔴 helper returns a marker
  const tone = pct >= 80 ? "text-risk-low" : pct >= 60 ? "text-gold" : "text-risk-high";
  const dot = pct >= 80 ? "bg-risk-low" : pct >= 60 ? "bg-gold" : "bg-risk-high";
  const dim = size === "lg" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <span className="inline-flex items-center gap-1.5" title={`Confidence: ${pct}%`}>
      <span className={`${dim} rounded-full ${dot}`} />
      {showLabel && <span className={`text-xs font-semibold ${tone}`}>{pct}% confidence</span>}
    </span>
  );
}

export default ConfidenceIndicator;
