import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  overdue: {
    cls: "border-risk-high/30 bg-risk-high/5 text-risk-high",
    icon: "M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  },
  due: {
    cls: "border-risk-medium/30 bg-risk-medium/5 text-risk-medium",
    icon: "M12 8v4l3 3M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  },
  no_data: {
    cls: "border-primary/30 bg-primary/5 text-primary",
    icon: "M12 5v14M5 12h14",
  },
};

// Compact banner shown at the top of the Command Center when data is due
// or overdue. Stays hidden when data is fresh, to avoid nagging.
function FreshnessBanner({ freshness }) {
  if (!freshness?.available) return null;
  if (freshness.status === "fresh") return null;

  const config = STATUS_CONFIG[freshness.status] || STATUS_CONFIG.due;
  const frequencyLabel = freshness.frequency
    ? freshness.frequency.charAt(0).toUpperCase() + freshness.frequency.slice(1)
    : "";

  return (
    <div className={`flex flex-col gap-3 rounded-card border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${config.cls}`}>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
          <path d={config.icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{freshness.message}</p>
          {frequencyLabel && (
            <p className="text-xs opacity-80">{frequencyLabel} upload mode · change in Settings</p>
          )}
        </div>
      </div>
      <Link
        to="/app/ingestion"
        className="shrink-0 rounded-pill bg-surface px-4 py-2 text-xs font-semibold text-ink shadow-sm transition hover:bg-bg-subtle"
      >
        Import now
      </Link>
    </div>
  );
}

export default FreshnessBanner;
