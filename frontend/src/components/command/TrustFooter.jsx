import { Info } from "lucide-react";
import ConfidenceIndicator from "../common/ConfidenceIndicator";

// TrustFooter — shared trust strip for the legacy intelligence cards: data
// source(s), confidence, freshness, an optional AI explanation/assumptions and
// a warning state. Mirrors the trust block ModuleIntelligenceCard renders, so
// every card exposes the same "where did this come from / how fresh / how
// confident" layer. Pure presentation; values come from the backend payload.
function TrustFooter({ sources, confidence, lastUpdated, explanation, assumptions, warning }) {
  const hasAny = (sources && sources.length) || confidence != null || lastUpdated || explanation || assumptions || warning;
  if (!hasAny) return null;
  return (
    <div className="mt-4 border-t border-border pt-3">
      {explanation && (
        <p className="mb-2 flex items-start gap-1.5 text-xs text-ink-muted">
          <Info size={12} className="mt-0.5 shrink-0 text-primary" />
          <span>{explanation}</span>
        </p>
      )}
      {assumptions && (
        <p className="mb-2 text-[11px] italic text-ink-muted">Assumptions: {assumptions}</p>
      )}
      {warning && (
        <p className="mb-2 rounded-lg bg-gold/10 px-2 py-1 text-[11px] font-medium text-gold">⚠ {warning}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        {sources && sources.length > 0 && <span>Source: {sources.join(", ")}</span>}
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {confidence != null && <ConfidenceIndicator value={confidence} />}
      </div>
    </div>
  );
}

export default TrustFooter;
