import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, TrendingUp, Target, Bot, Sparkles, ChevronLeft, ChevronRight,
  Play, Pause, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppearance } from "../../context/AppearanceContext";
import GreetingRobot from "./GreetingRobot";
import { formatCurrency } from "../../utils/formatters";
import { LEVELS, classifyActions } from "./attentionEngine";

// Executive Carousel — the auto-rotating 3-card hero from the reference design.
// Slide 1: Executive Brief (top risk / opportunity / focus). Slide 2: AI CFO
// Says (proactive brief insights). Slide 3: Business Attention (severity gauge).
// Auto-rotates on a configurable interval, pauses on hover, with play/pause,
// prev/next, and dot indicators. Pure presentation over existing data.

const RISK_CATS = new Set(["collections", "liquidity_risk", "working_capital", "debt_risk", "cash_flow_risk", "customer_risk", "profitability", "market_risk", "inventory_risk", "reconciliation", "compliance"]);
const OPP_CATS = new Set(["opportunity", "market_opportunity"]);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ---- Slide 1: Executive Brief ------------------------------------------------
function ExecutiveBriefSlide({ data }) {
  const ac = data.action_center || {};
  const all = [...(ac.today || []), ...(ac.week || []), ...(ac.month || [])];
  const topRisk = all.find((a) => RISK_CATS.has(a.category) && a.priority === "high") || all.find((a) => RISK_CATS.has(a.category));
  const topOpp = all.find((a) => OPP_CATS.has(a.category));
  const topFocus = (ac.today && ac.today[0]) || all[0];

  const Col = ({ icon: Icon, tone, label, title, body }) => (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className={tone} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${tone}`}>{label}</span>
      </div>
      <p className="mt-2 text-sm font-bold leading-snug text-ink">{title}</p>
      {body && <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{body}</p>}
    </div>
  );

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Col icon={AlertTriangle} tone="text-risk-high" label="Top risk"
        title={topRisk ? topRisk.title : "No pressing risks"}
        body={topRisk ? topRisk.reason : "Your business has no critical risks right now."} />
      <Col icon={TrendingUp} tone="text-risk-low" label="Top opportunity"
        title={topOpp ? topOpp.title : "Keep importing data"}
        body={topOpp ? topOpp.reason : "Upload more to surface opportunities."} />
      <Col icon={Target} tone="text-primary" label="Today's focus"
        title={topFocus ? topFocus.title : "You're all caught up"}
        body={topFocus ? (topFocus.recommended_action || topFocus.reason) : "Nothing needs action today."} />
    </div>
  );
}

// ---- Slide 2: AI CFO Says ----------------------------------------------------
function AiCfoSlide({ brief, onOpen }) {
  const points = [];
  if (brief && brief.has_action) {
    if (brief.title) points.push(brief.title);
    if (brief.reason) points.push(brief.reason);
    if (brief.action) points.push(`Do this: ${brief.action}`);
  }
  const focusLine = brief && brief.based_on && brief.based_on.length ? brief.based_on.join(" + ") : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
        <Bot size={40} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        {points.length > 0 ? (
          <ul className="space-y-2">
            {points.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-risk-low" />
                <span className="text-ink">{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">{(brief && brief.message) || "Your AI CFO is reviewing the latest numbers. Insights will appear as you import data."}</p>
        )}
        {focusLine && (
          <p className="mt-3 text-sm font-semibold text-primary">Recommended focus: <span className="font-bold">{focusLine}</span></p>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:text-primary"
        >
          View full AI CFO insight <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ---- Slide 3: Business Attention --------------------------------------------
function AttentionSlide({ data }) {
  const { counts, impactAtRisk } = classifyActions(data.action_center);
  const total = counts.critical + counts.action + counts.watch + counts.normal;
  const segs = [
    { c: counts.critical, color: "#ef4444" },
    { c: counts.action, color: "#f59e0b" },
    { c: counts.watch, color: "#eab308" },
    { c: counts.normal, color: "#22c55e" },
  ];
  const denom = total || 1;
  let acc = 0;
  const stops = segs.map((s) => {
    const start = (acc / denom) * 360;
    acc += s.c;
    const end = (acc / denom) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(", ");
  const gaugeBg = total > 0 ? `conic-gradient(${stops})` : "conic-gradient(#1e2640 0deg 360deg)";

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
        <div className="h-32 w-32 rounded-full" style={{ background: gaugeBg }} />
        <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface">
          <span className="figure text-2xl font-bold text-ink">{total}</span>
          <span className="text-[10px] font-medium text-ink-muted">Total alerts</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="space-y-1.5">
          {LEVELS.map((lvl) => (
            <div key={lvl.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${lvl.dot}`} />
                <span className="text-ink">{lvl.label}</span>
              </span>
              <span className="figure text-sm font-bold text-ink">{counts[lvl.id]}</span>
            </div>
          ))}
        </div>
        {impactAtRisk > 0 && (
          <p className="mt-3 border-t border-border pt-2 text-sm">
            <span className="text-ink-muted">Potential impact: </span>
            <span className="figure font-bold text-risk-high">{formatCurrency(impactAtRisk)} at risk</span>
          </p>
        )}
      </div>
    </div>
  );
}

const SLIDES = [
  { id: "brief", n: 1, title: "Executive Brief", icon: Target },
  { id: "aicfo", n: 2, title: "AI CFO Says", icon: Bot },
  { id: "attention", n: 3, title: "Business Attention", icon: AlertTriangle },
];

function ExecutiveCarousel({ data, user, brief }) {
  const navigate = useNavigate();
  const { appearance } = useAppearance();
  const rotationMs = appearance.carouselRotationMs ?? 7000;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [dir, setDir] = useState(1);
  const timerRef = useRef(null);

  const go = useCallback((target) => {
    setDir(target >= index ? 1 : -1);
    setIndex(((target % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, [index]);
  const next = useCallback(() => { setDir(1); setIndex((i) => (i + 1) % SLIDES.length); }, []);
  const prev = useCallback(() => { setDir(-1); setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length); }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!playing || hovered || rotationMs === 0) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), rotationMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, hovered, rotationMs]);

  const slide = SLIDES[index];
  const SlideIcon = slide.icon;

  const variants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="neon-card neon-ring relative overflow-hidden rounded-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, rgb(var(--c-primary)), transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, rgb(var(--c-gold)), transparent 70%)" }} />

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <GreetingRobot size={84} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{todayLabel()}</p>
              <h1 className="font-display mt-1 flex items-center gap-2 text-2xl font-bold text-ink sm:text-3xl">
                {greeting()}{user?.first_name ? `, ${user.first_name}` : ""} <span className="text-2xl">👋</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to ${s.title}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-ink-muted"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={prev} aria-label="Previous slide" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted transition hover:border-primary/40 hover:text-ink">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={next} aria-label="Next slide" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted transition hover:border-primary/40 hover:text-ink">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{slide.n}</span>
          <span className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
            <SlideIcon size={16} className="text-primary" /> {slide.title}
          </span>
          <Sparkles size={15} className="ml-auto text-primary" />
        </div>

        <div className="relative mt-3 min-h-[120px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={slide.id}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {slide.id === "brief" && <ExecutiveBriefSlide data={data} />}
              {slide.id === "aicfo" && <AiCfoSlide brief={brief} onOpen={() => navigate("/app/chat")} />}
              {slide.id === "attention" && <AttentionSlide data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}

export default ExecutiveCarousel;
