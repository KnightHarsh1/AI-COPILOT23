import { useState } from "react";

// SetupPill — compact onboarding indicator in the navbar. Shows setup progress
// (e.g. "Setup 1/3"); clicking opens a popover with completed/remaining steps
// and a Continue Setup button. When complete, shows "Setup Complete". Reads the
// same coverage payload the big OnboardingCard uses, so progress stays in sync.

function SetupPill({ coverage, onContinue }) {
  const [open, setOpen] = useState(false);
  if (!coverage?.items) return null;

  const items = coverage.items;
  const done = items.filter((i) => i.present);
  const remaining = items.filter((i) => !i.present);
  const total = items.length;
  const complete = coverage.is_complete || remaining.length === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-semibold transition ${
          complete
            ? "border-risk-low/30 bg-risk-low/10 text-risk-low"
            : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
        }`}
      >
        {complete ? (
          <>✓ Setup complete</>
        ) : (
          <>⚙ Setup {done.length}/{total}</>
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-72 rounded-card border border-border bg-surface p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-ink">Setup progress</p>
              <span className="text-xs font-bold text-primary">{coverage.coverage_score}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coverage.coverage_score}%` }} />
            </div>

            <div className="mt-3 space-y-1.5">
              {done.map((it) => (
                <div key={it.key} className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-risk-low/15 text-[10px] font-bold text-risk-low">✓</span>
                  <span className="text-ink">{it.label}</span>
                </div>
              ))}
              {remaining.map((it) => (
                <div key={it.key} className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[10px] font-bold text-ink-muted">•</span>
                  <span className="text-ink-muted">{it.label}</span>
                  {it.unlocks && <span className="ml-auto text-[11px] text-ink-muted">{it.unlocks}</span>}
                </div>
              ))}
            </div>

            {!complete && (
              <button
                type="button"
                onClick={() => { setOpen(false); onContinue && onContinue(); }}
                className="mt-3 w-full rounded-pill bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                Continue setup
              </button>
            )}
            {complete && (
              <p className="mt-3 text-xs text-ink-muted">All data sources connected. Your intelligence is fully unlocked.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SetupPill;
