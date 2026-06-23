import { useState } from "react";

// SourceBadge — the Trust System primitive. A small "source" affordance that,
// on hover/tap, reveals where a number came from, when it was last updated, and
// the confidence. Use next to any headline figure so users always know the
// provenance of what they're looking at.
//
// Usage: <SourceBadge source="Sales Register" updated="22 Jun 2026" confidence={98} />

function SourceBadge({ source, updated, confidence, note }) {
  const [open, setOpen] = useState(false);
  if (!source && !updated && !note) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Where this number comes from"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] font-bold leading-none text-ink-muted transition hover:border-primary hover:text-primary"
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-30 mb-1.5 w-56 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-left shadow-lg">
          {source && (
            <span className="block text-xs">
              <span className="font-medium text-ink-muted">Source: </span>
              <span className="font-semibold text-ink">{source}</span>
            </span>
          )}
          {updated && (
            <span className="mt-1 block text-xs">
              <span className="font-medium text-ink-muted">Updated: </span>
              <span className="text-ink">{updated}</span>
            </span>
          )}
          {confidence != null && (
            <span className="mt-1 block text-xs">
              <span className="font-medium text-ink-muted">Confidence: </span>
              <span className="text-ink">{Math.round(confidence)}%</span>
            </span>
          )}
          {note && <span className="mt-1.5 block text-[11px] leading-snug text-ink-muted">{note}</span>}
        </span>
      )}
    </span>
  );
}

export default SourceBadge;
