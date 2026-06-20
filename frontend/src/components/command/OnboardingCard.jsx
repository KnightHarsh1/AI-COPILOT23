import { useState } from "react";
import { Link } from "react-router-dom";
import GrowthService from "../../services/growthService";
import CommandCenterService from "../../services/commandCenterService";

const INDUSTRIES = [
  "Retail", "Wholesale", "Manufacturing", "Services",
  "Textile", "Food Processing", "Construction", "Other",
];

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
              {it.present ? "\u2713" : "\u2022"}
            </span>
            <span className={it.present ? "text-ink" : "text-ink-muted"}>{it.label}</span>
            <span className="ml-auto text-xs text-ink-muted">{it.unlocks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDots({ step, total }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-bg-subtle"}`} />
      ))}
    </div>
  );
}

function OnboardingCard({ coverage, onChanged }) {
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  if (!coverage || coverage.is_complete) {
    return coverage ? (
      <div className="rounded-card border border-border bg-surface p-5 shadow-card"><CoverageMeter coverage={coverage} /></div>
    ) : null;
  }

  const saveIndustry = async () => {
    if (industry) {
      try { await CommandCenterService.updateBusinessProfile({ industry: industry.toLowerCase() }); } catch (_) { /* non-fatal */ }
    }
    setStep(1);
  };

  const saveGoal = async () => {
    if (goal) {
      try { await GrowthService.upsertGoal({ goal_type: "revenue", target_amount: parseFloat(goal) }); } catch (_) { /* non-fatal */ }
    }
    setStep(2);
  };

  const loadDemo = async () => {
    setLoading(true);
    try { await GrowthService.loadDemoData(); onChanged?.(); } catch (_) { /* non-fatal */ }
    setLoading(false);
  };

  return (
    <section className="rounded-card border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Set up &middot; step {step + 1} of 3</p>
        <StepDots step={step} total={3} />
      </div>

      {step === 0 && (
        <div className="mt-3">
          <h2 className="font-display text-xl font-bold text-ink">What kind of business do you run?</h2>
          <p className="mt-1 text-sm text-ink-muted">This tailors your benchmarks and insights.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button key={ind} type="button" onClick={() => setIndustry(ind)}
                className={`rounded-pill border px-4 py-2 text-sm font-medium transition ${industry === ind ? "border-primary bg-primary text-white" : "border-border text-ink hover:bg-bg-subtle"}`}>
                {ind}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={saveIndustry} className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
              Continue
            </button>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-ink-muted">Skip</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-3">
          <h2 className="font-display text-xl font-bold text-ink">What&rsquo;s your monthly revenue goal?</h2>
          <p className="mt-1 text-sm text-ink-muted">We&rsquo;ll track your progress towards it. You can change this later.</p>
          <input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 500000"
            className="mt-4 w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none" />
          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={saveGoal} className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
              Continue
            </button>
            <button type="button" onClick={() => setStep(2)} className="text-sm text-ink-muted">Skip</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-3">
          <h2 className="font-display text-xl font-bold text-ink">Add your business data</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {coverage.next_step || "Upload your data to unlock every section \u2014 or explore with demo data first."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/app/ingestion" className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover">
              Import my data
            </Link>
            <button type="button" onClick={loadDemo} disabled={loading}
              className="rounded-pill border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60">
              {loading ? "Loading demo\u2026" : "Try with demo data"}
            </button>
          </div>
          <CoverageMeter coverage={coverage} />
        </div>
      )}
    </section>
  );
}

export default OnboardingCard;
