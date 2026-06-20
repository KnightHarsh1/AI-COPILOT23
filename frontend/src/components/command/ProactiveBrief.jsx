import { useEffect, useState } from "react";
import GrowthService from "../../services/growthService";

function ProactiveBrief() {
  const [brief, setBrief] = useState(null);

  useEffect(() => {
    GrowthService.getProactiveBrief().then(setBrief).catch(() => setBrief(null));
  }, []);

  if (!brief) return null;

  if (!brief.has_action) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-risk-low/20 bg-risk-low/5 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-risk-low/15 text-risk-low">✓</span>
        <p className="text-sm font-medium text-ink">{brief.message}</p>
      </div>
    );
  }

  const tone = brief.priority === "high" ? "border-risk-high/25 bg-risk-high/5" : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-card border px-5 py-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">AI</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your AI CFO says</p>
          <p className="mt-1 font-semibold text-ink">{brief.title}</p>
          {brief.reason && <p className="mt-1 text-sm text-ink-muted">{brief.reason}</p>}
          {brief.action && (
            <p className="mt-1 text-sm text-ink"><span className="font-medium">Do this: </span>{brief.action}</p>
          )}
          {brief.based_on && brief.based_on.length > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              <span className="font-medium">Based on:</span> {brief.based_on.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProactiveBrief;
