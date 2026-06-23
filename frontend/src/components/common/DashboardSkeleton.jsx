// Premium skeleton loader for the dashboard. Shimmer placeholders plus a
// rotating "intelligent" status message so loading feels purposeful. Pure UI.
import { useEffect, useState } from "react";

const MESSAGES = [
  "Analyzing revenue trends",
  "Generating CFO insights",
  "Processing financial data",
  "Reviewing cash position",
  "Checking for risks & opportunities",
];

export function DashboardSkeleton() {
  const [msg, setMsg] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-ink-muted">{MESSAGES[msg]}…</p>
      </div>

      {/* Hero skeleton */}
      <div className="skeleton h-32 w-full rounded-card" />

      {/* KPI grid skeleton */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-card" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>

      {/* Section skeletons */}
      <div className="skeleton h-40 w-full rounded-card" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="skeleton h-28 rounded-card" />
        <div className="skeleton h-28 rounded-card" />
      </div>
    </div>
  );
}

export default DashboardSkeleton;
