import { useState } from "react";
import { Link } from "react-router-dom";
import GrowthService from "../../services/growthService";

function CoverageMeter({ coverage }) {
  if (!coverage?.items) return null;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">Business data coverage</span>
        <span className="font-bold text-primary">{coverage.coverage_score}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coverage.coverage_score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {coverage.items.map((it) => (
          <div key={it.key} className="flex items-center gap-2 text-sm">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${it.present ? "bg-risk-low/15 text-risk-low" : "bg-bg-subtle text-ink-muted"}`}>
              {it.present ? "✓" : "•"}
            </span>
            <span className={it.present ? "text-ink" : "text-ink-muted"}>{it.label}</span>
            <span className="ml-auto text-xs text-ink-muted">{it.unlocks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnboardingCard({ coverage, onChanged }) {
  const [loading, setLoading] = useState(false);
  if (!coverage || coverage.is_complete) {
    return coverage ? <div className="rounded-card border border-border bg-surface p-5 shadow-card"><CoverageMeter coverage={coverage} /></div> : null;
  }

  const loadDemo = async () => {
    setLoading(true);
    try { await GrowthService.loadDemoData(); onChanged?.(); }
    catch (_) { /* non-fatal */ }
    setLoading(false);
  };

  return (
    <section className="rounded-card border border-primary/20 bg-primary/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get started</p>
      <h2 className="font-display mt-1 text-xl font-bold text-ink">Let&rsquo;s set up your Command Center</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {coverage.next_step || "Upload your business data to unlock every section."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/app/ingestion" className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover">
          Import my data
        </Link>
        <button type="button" onClick={loadDemo} disabled={loading}
          className="rounded-pill border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60">
          {loading ? "Loading demo…" : "Try with demo data"}
        </button>
      </div>
      <CoverageMeter coverage={coverage} />
    </section>
  );
}

export default OnboardingCard;
