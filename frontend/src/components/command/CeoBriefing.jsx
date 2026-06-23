import { motion } from "framer-motion";
import { formatCurrency } from "../../utils/formatters";

// CEO Briefing — the executive band that opens the Command Center. Answers, in
// one glance: how is my business, what changed, what's the top risk, the top
// opportunity, and the single most important thing to do today. All derived
// from data already in the dashboard payload (health, action_center, scoreChange).

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function Pill({ tone, children }) {
  const cls = {
    risk: "bg-risk-high/10 text-risk-high",
    opp: "bg-risk-low/10 text-risk-low",
    neutral: "bg-bg-subtle text-ink-muted",
  }[tone];
  return <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>;
}

function CeoBriefing({ data, user, scoreChange }) {
  if (!data) return null;
  const health = data.health || {};
  const ac = data.action_center || {};
  const score = health.health_score != null ? Math.round(health.health_score) : null;

  // Top risk = highest-priority risk-category action; top opportunity = first
  // opportunity-category action. The action center already ranks these.
  const all = [...(ac.today || []), ...(ac.week || []), ...(ac.month || [])];
  const RISK_CATS = new Set(["collections", "liquidity_risk", "working_capital", "debt_risk", "cash_flow_risk", "customer_risk", "profitability", "market_risk", "inventory_risk", "reconciliation", "compliance"]);
  const OPP_CATS = new Set(["opportunity", "market_opportunity"]);
  const topRisk = all.find((a) => RISK_CATS.has(a.category) && a.priority === "high") || all.find((a) => RISK_CATS.has(a.category));
  const topOpp = all.find((a) => OPP_CATS.has(a.category));
  const topFocus = (ac.today && ac.today[0]) || all[0];

  // Health trend sentence.
  let healthLine = "Upload more data to track how your business health changes.";
  if (scoreChange && scoreChange.previous != null && scoreChange.current != null) {
    const dir = scoreChange.current > scoreChange.previous ? "improved" : scoreChange.current < scoreChange.previous ? "declined" : "held steady";
    healthLine = `Your business health ${dir} from ${Math.round(scoreChange.previous)} to ${Math.round(scoreChange.current)}.`;
  } else if (score != null) {
    healthLine = `Your business health score is ${score} out of 100.`;
  }

  const scoreTone = score == null ? "text-ink" : score >= 70 ? "text-risk-low" : score >= 45 ? "text-gold" : "text-risk-high";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="neon-card neon-ring shine relative overflow-hidden rounded-card"
    >
      {/* Ambient neon glow blobs behind the hero content */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, rgb(var(--c-primary)), transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, rgb(var(--c-gold)), transparent 70%)" }} />
      <div className="relative z-10 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{todayLabel()}</p>
            <h1 className="font-display mt-1 text-2xl font-bold text-ink sm:text-3xl">
              {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">{healthLine}</p>
          </div>
          {score != null && (
            <div className="flex shrink-0 flex-col items-center rounded-2xl border border-border bg-surface px-5 py-3 shadow-sm">
              <span className={`figure text-3xl font-bold leading-none ${scoreTone}`}>{score}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Health / 100</span>
            </div>
          )}
        </div>

        {/* Top risk · opportunity · focus */}
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-risk-high/20 bg-risk-high/5 p-4">
            <Pill tone="risk">Top risk</Pill>
            {topRisk ? (
              <>
                <p className="mt-2 text-sm font-semibold text-ink">{topRisk.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{topRisk.reason}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No pressing risks detected.</p>
            )}
          </div>

          <div className="rounded-xl border border-risk-low/20 bg-risk-low/5 p-4">
            <Pill tone="opp">Top opportunity</Pill>
            {topOpp ? (
              <>
                <p className="mt-2 text-sm font-semibold text-ink">{topOpp.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{topOpp.reason}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">Upload more data to surface opportunities.</p>
            )}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Pill tone="neutral">Today&rsquo;s focus</Pill>
            {topFocus ? (
              <>
                <p className="mt-2 text-sm font-semibold text-ink">{topFocus.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{topFocus.recommended_action || topFocus.reason}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">You&rsquo;re all caught up for today.</p>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default CeoBriefing;
