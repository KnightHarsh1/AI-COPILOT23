// A single health-score renderer that switches between 6 visual styles and
// applies 1 of 5 colour skins. Every style is fed the same live `score`
// (0-100) and `word`. No mock data — the caller passes the real health score.

const STATES = [
  { min: 85, word: "Excellent", text: "text-risk-low", stroke: "#10b981", glow: "#34d399" },
  { min: 70, word: "Healthy", text: "text-risk-low", stroke: "#22c55e", glow: "#4ade80" },
  { min: 55, word: "Watch", text: "text-gold", stroke: "#f59e0b", glow: "#fbbf24" },
  { min: 40, word: "Needs work", text: "text-gold", stroke: "#f97316", glow: "#fb923c" },
  { min: 0, word: "At risk", text: "text-risk-high", stroke: "#ef4444", glow: "#f87171" },
];

function stateFor(score) {
  const v = Math.max(0, Math.min(100, Math.round(score)));
  return { v, ...(STATES.find((s) => v >= s.min) || STATES[STATES.length - 1]) };
}

// Skins map to subtle wrappers around the score body — they never change the
// number, only its surface treatment.
const SKIN_WRAP = {
  classic: "border border-border bg-bg-subtle",
  neon: "border border-primary/40 bg-bg-subtle shadow-[0_0_20px_-4px_var(--glow)]",
  glass: "border border-white/10 bg-white/5 backdrop-blur",
  gradient: "border border-transparent bg-gradient-to-br from-primary/15 to-gold/10",
  cyberpunk: "border border-risk-high/40 bg-[#0c0c14] shadow-[0_0_16px_-2px_var(--glow)]",
  gold: "border border-gold/40 bg-gradient-to-br from-gold/15 to-transparent",
};

function Ring({ s, size = 64, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (s.v / 100) * c;
  const id = `hs-${s.word.replace(/\s/g, "")}-${size}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={s.glow} />
            <stop offset="100%" stopColor={s.stroke} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <span className="figure absolute inset-0 flex items-center justify-center text-lg font-bold text-ink" style={{ lineHeight: 1 }}>
        {s.v}
      </span>
    </div>
  );
}

function Gauge({ s, size = 120 }) {
  // Semicircle speedometer with a needle.
  const cx = size / 2;
  const cy = size * 0.62;
  const r = size * 0.42;
  const angle = Math.PI - (s.v / 100) * Math.PI; // 180deg → 0deg
  const nx = cx + r * 0.82 * Math.cos(angle);
  const ny = cy - r * 0.82 * Math.sin(angle);
  const arc = (from, to, color) => {
    const a0 = Math.PI - (from / 100) * Math.PI;
    const a1 = Math.PI - (to / 100) * Math.PI;
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    return <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={size * 0.08} strokeLinecap="round" />;
  };
  return (
    <svg width={size} height={size * 0.78} className="shrink-0">
      {arc(0, 40, "#ef4444")}
      {arc(40, 70, "#f59e0b")}
      {arc(70, 100, "#22c55e")}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="rgb(var(--c-ink))" strokeWidth={2.5} strokeLinecap="round" style={{ transition: "all 700ms ease" }} />
      <circle cx={cx} cy={cy} r={size * 0.04} fill="rgb(var(--c-ink))" />
      <text x={cx} y={cy - size * 0.16} textAnchor="middle" className="figure" fill="rgb(var(--c-ink))" fontSize={size * 0.18} fontWeight="700">{s.v}</text>
    </svg>
  );
}

function Shield({ s }) {
  return (
    <div className="relative shrink-0" style={{ width: 72, height: 80 }}>
      <svg viewBox="0 0 72 80" width="72" height="80">
        <path d="M36 4 L66 16 V40 C66 60 52 72 36 78 C20 72 6 60 6 40 V16 Z" fill={`${s.stroke}22`} stroke={s.stroke} strokeWidth="2.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="figure text-xl font-bold text-ink" style={{ lineHeight: 1 }}>{s.v}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted">Safety</span>
      </div>
    </div>
  );
}

function Orb({ s }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: 80, height: 80 }}>
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-md"
        style={{ background: `radial-gradient(circle at 35% 30%, ${s.glow}, ${s.stroke})`, animation: "ai-orb-pulse 3s ease-in-out infinite" }}
      />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${s.glow}, ${s.stroke})` }}>
        <span className="figure text-lg font-bold text-white" style={{ lineHeight: 1 }}>{s.v}</span>
      </div>
    </div>
  );
}

function CreditCard({ s }) {
  const bands = [
    { label: "Poor", max: 40 },
    { label: "Fair", max: 55 },
    { label: "Good", max: 70 },
    { label: "Great", max: 85 },
    { label: "Excellent", max: 100 },
  ];
  const band = bands.find((b) => s.v <= b.max) || bands[bands.length - 1];
  return (
    <div className="w-full">
      <div className="flex items-end justify-between">
        <span className="figure text-3xl font-bold text-ink leading-none">{s.v}</span>
        <span className={`text-sm font-bold ${s.text}`}>{band.label}</span>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full">
        <span className="flex-1 bg-risk-high" />
        <span className="flex-1 bg-gold" />
        <span className="flex-1 bg-yellow-400/70" />
        <span className="flex-1 bg-risk-low/70" />
        <span className="flex-1 bg-risk-low" />
      </div>
      <div className="relative mt-1 h-3">
        <span className="absolute -translate-x-1/2 text-[10px] font-bold text-ink" style={{ left: `${s.v}%` }}>▲</span>
      </div>
    </div>
  );
}

// Classic = the compact pill with a small ring (the original default badge).
function Classic({ s }) {
  return (
    <div className="flex items-center gap-3">
      <Ring s={s} size={56} stroke={6} />
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business health</p>
        <p className={`text-sm font-bold ${s.text}`}>{s.word}</p>
      </div>
    </div>
  );
}

function HealthScore({ score = 0, style = "classic", skin = "classic", compact = false }) {
  const s = stateFor(score);
  const wrap = SKIN_WRAP[skin] || SKIN_WRAP.classic;
  const glowVar = { "--glow": s.glow };

  let body;
  switch (style) {
    case "ring":
      body = (
        <div className="flex items-center gap-3">
          <Ring s={s} size={compact ? 64 : 80} stroke={8} />
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business health</p>
            <p className={`text-base font-bold ${s.text}`}>{s.word}</p>
          </div>
        </div>
      );
      break;
    case "gauge":
      body = (
        <div className="flex flex-col items-center">
          <Gauge s={s} size={compact ? 110 : 132} />
          <p className={`-mt-1 text-sm font-bold ${s.text}`}>{s.word}</p>
        </div>
      );
      break;
    case "shield":
      body = (
        <div className="flex items-center gap-3">
          <Shield s={s} />
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Trust rating</p>
            <p className={`text-base font-bold ${s.text}`}>{s.word}</p>
          </div>
        </div>
      );
      break;
    case "orb":
      body = (
        <div className="flex items-center gap-3">
          <Orb s={s} />
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business health</p>
            <p className={`text-base font-bold ${s.text}`}>{s.word}</p>
          </div>
        </div>
      );
      break;
    case "credit":
      body = <CreditCard s={s} />;
      break;
    default:
      body = <Classic s={s} />;
  }

  const padding = style === "credit" ? "px-5 py-4 w-full max-w-xs" : "py-2 pl-2 pr-5";
  return (
    <div className={`inline-flex shrink-0 items-center rounded-card ${wrap} ${padding}`} style={glowVar}>
      {body}
    </div>
  );
}

export default HealthScore;
