import { useEffect, useState } from "react";
import GrowthService from "../../services/growthService";

function ScoreChangeCard() {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    GrowthService.getScoreChange().then(setDiff).catch(() => setDiff(null));
  }, []);

  if (!diff || !diff.available) return null;

  const up = diff.delta > 0;
  const flat = diff.delta === 0;
  const color = flat ? "text-ink-muted" : up ? "text-risk-low" : "text-risk-high";
  const bg = flat ? "border-border bg-surface" : up ? "border-risk-low/20 bg-risk-low/5" : "border-risk-high/20 bg-risk-high/5";

  return (
    <div className={`rounded-card border px-5 py-4 ${bg}`}>
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${color}`}>{flat ? "→" : up ? "▲" : "▼"}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{diff.headline}</p>
          {diff.reasons && diff.reasons.length > 0 && (
            <p className="mt-0.5 text-xs text-ink-muted">Why: {diff.reasons.join(", ")}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScoreChangeCard;
