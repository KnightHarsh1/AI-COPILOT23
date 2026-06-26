import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Sparkles, ShieldCheck, Wallet, Users } from "lucide-react";

// DashboardPreview primitives — small, self-contained, animated representations
// of real Business Copilot surfaces (health ring, KPI tiles, trend spark, AI
// brief). Used by the landing hero and the auth split-screen so the product is
// visible before sign-in. No live data dependency; values are illustrative and
// clearly framed as a preview by surrounding copy.

const EASE = [0.22, 1, 0.36, 1];

// Animated count-up number. Uses a real rAF counter so the value actually
// animates; falls back to the final value under reduced motion.
function CountUp({ to, prefix = "", suffix = "", duration = 1.4 }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setN(to); return; }
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduce]);
  return <>{prefix}{n}{suffix}</>;
}

// Circular health-score gauge.
export function HealthRing({ score = 86, size = 116 }) {
  const reduce = useReducedMotion();
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border))" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-risk-low))" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? offset : c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-ink">{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Health</span>
      </div>
    </div>
  );
}

// Compact KPI tile with sparkline.
export function KpiTile({ icon: Icon, label, value, delta, positive = true, spark = [] }) {
  const points = spark.length ? spark : [8, 12, 9, 14, 11, 16, 13, 18];
  const max = Math.max(...points), min = Math.min(...points);
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${28 - ((p - min) / (max - min || 1)) * 24}`)
    .join(" ");
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4 shadow-card backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {Icon && <Icon size={16} />}
        </span>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-risk-low" : "text-risk-high"}`}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{delta}
        </span>
      </div>
      <p className="mt-3 font-display text-lg font-bold text-ink">{value}</p>
      <p className="text-[11px] text-ink-muted">{label}</p>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 h-7 w-full">
        <polyline points={path} fill="none" stroke={positive ? "rgb(var(--c-risk-low))" : "rgb(var(--c-risk-high))"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

// Floating KPI card (used as accent over the hero mock).
export function FloatingKpi({ icon: Icon, label, value, tone = "primary", className = "", delay = 0, float = true }) {
  const reduce = useReducedMotion();
  const toneMap = {
    primary: "text-primary bg-primary/10",
    low: "text-risk-low bg-risk-low/10",
    gold: "text-gold bg-gold/10",
  };
  return (
    <motion.div
      className={`absolute z-20 flex items-center gap-2.5 rounded-2xl border border-border bg-surface/90 px-3.5 py-2.5 shadow-[0_8px_30px_-6px_rgb(0_0_0_/0.18)] backdrop-blur-md ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <motion.div
        className="flex items-center gap-2.5"
        animate={reduce || !float ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[tone]}`}>
          {Icon && <Icon size={15} />}
        </span>
        <div>
          <p className="font-display text-sm font-bold leading-none text-ink">{value}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{label}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// AI insight card (the daily brief, condensed).
export function AiBriefCard({ compact = false }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-white">
          <Sparkles size={14} />
        </span>
        <span className="text-xs font-semibold text-ink">AI CFO Brief</span>
        <span className="ml-auto rounded-pill bg-risk-low/10 px-2 py-0.5 text-[10px] font-semibold text-risk-low">High priority</span>
      </div>
      <p className="mt-3 font-display text-sm font-bold text-ink">Revenue grew 18% — repeat orders are driving it.</p>
      {!compact && (
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Your top 5 customers placed 40% more orders. Launch a referral offer to convert this momentum.
        </p>
      )}
      <p className="mt-2 text-xs font-semibold text-gold">↗ Could add ₹40,000–60,000 monthly</p>
    </div>
  );
}

export const PREVIEW_ICONS = { TrendingUp, ShieldCheck, Wallet, Users, Sparkles };
export default { HealthRing, KpiTile, FloatingKpi, AiBriefCard, CountUp };
