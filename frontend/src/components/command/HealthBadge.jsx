// A premium, self-contained health badge: a circular progress ring that
// fills to the score with a status-colored gradient, the number centered
// inside, and the status word beside it. Fixed SVG dimensions mean it can
// never overflow or wrap.

const STATES = [
  { min: 85, word: "Excellent", from: "#34d399", to: "#10b981", text: "text-risk-low" },
  { min: 70, word: "Healthy", from: "#4ade80", to: "#22c55e", text: "text-risk-low" },
  { min: 55, word: "Watch", from: "#fbbf24", to: "#f59e0b", text: "text-gold" },
  { min: 40, word: "Needs work", from: "#fb923c", to: "#f97316", text: "text-gold" },
  { min: 0, word: "At risk", from: "#f87171", to: "#ef4444", text: "text-risk-high" },
];

function HealthBadge({ score = 0 }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const state = STATES.find((s) => value >= s.min) || STATES[STATES.length - 1];

  const size = 56;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const gradId = `health-grad-${state.word.replace(/\s/g, "")}`;

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-pill border border-border bg-bg-subtle py-2 pl-2 pr-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={state.from} />
              <stop offset="100%" stopColor={state.to} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(var(--c-border))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease" }}
          />
        </svg>
        <span
          className="figure absolute inset-0 flex items-center justify-center text-base font-bold text-ink"
          style={{ lineHeight: 1 }}
        >
          {value}
        </span>
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business health</p>
        <p className={`text-sm font-bold ${state.text}`}>{state.word}</p>
      </div>
    </div>
  );
}

export default HealthBadge;
