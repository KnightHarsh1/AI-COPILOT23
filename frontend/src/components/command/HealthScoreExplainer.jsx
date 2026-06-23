// Health Score Explainer — an executive-grade Virtual CFO insight panel (not a
// plain collapsible row). Collapsed: score, status, top positive driver,
// biggest weakness, and a "View Score Breakdown" CTA. Expanded: all
// contributors with percentages, improvement recommendations, and a confidence
// indicator. Pure presentation — reads the existing health payload, changes no
// calculations. Animations are CSS-based (no framer-motion dependency).

import { useState } from "react";
import HealthScore from "../appearance/HealthScore";

const COMPONENT_LABELS = {
  revenue_growth_score: { label: "Revenue growth", help: "How fast your sales are growing" },
  profitability_score: { label: "Profitability", help: "How much profit you keep from sales" },
  inventory_health_score: { label: "Inventory health", help: "How efficiently stock turns into sales" },
  customer_risk_score: { label: "Customer strength", help: "How healthy and diversified your customers are" },
  liquidity_solvency_score: { label: "Liquidity & solvency", help: "Whether you can cover what you owe" },
};

function statusFor(score) {
  if (score >= 80) return { label: "Excellent", tone: "text-risk-low", soft: "bg-risk-low/10", ring: "border-risk-low/30" };
  if (score >= 65) return { label: "Good", tone: "text-risk-low", soft: "bg-risk-low/10", ring: "border-risk-low/25" };
  if (score >= 45) return { label: "Watch", tone: "text-gold", soft: "bg-gold/10", ring: "border-gold/30" };
  return { label: "Critical", tone: "text-risk-high", soft: "bg-risk-high/10", ring: "border-risk-high/30" };
}

function Bar({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const tone = v >= 70 ? "bg-risk-low" : v >= 45 ? "bg-gold" : "bg-risk-high";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%`, transition: "width 700ms cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

function HealthScoreExplainer({ health, scoreChange, healthStyle = "classic" }) {
  const [open, setOpen] = useState(false);
  if (!health || health.health_score == null) return null;

  const score = Math.round(health.health_score);
  const status = statusFor(score);
  const components = health.components || {};
  const unavailable = health.components_unavailable || [];
  const entries = Object.entries(components).filter(([k]) => COMPONENT_LABELS[k]);
  const dataCompleteness = health.data_completeness != null ? Math.round(health.data_completeness) : null;

  const sorted = entries.slice().sort((a, b) => b[1] - a[1]);
  const topDriver = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let changeLine = null;
  if (scoreChange && scoreChange.previous != null && scoreChange.current != null && scoreChange.previous !== scoreChange.current) {
    const up = scoreChange.current > scoreChange.previous;
    changeLine = `${up ? "▲ Up" : "▼ Down"} ${Math.abs(Math.round(scoreChange.current - scoreChange.previous))} pts recently`;
  }

  return (
    <section
      className={`group rounded-card border ${status.ring} bg-surface shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
      style={{ boxShadow: open ? undefined : undefined }}
    >
      {/* Collapsed header / always-visible summary */}
      <button type="button" onClick={() => setOpen((v) => !v)} className="block w-full p-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {healthStyle && healthStyle !== "classic" ? (
              <div className="shrink-0"><HealthScore score={score} style={healthStyle} /></div>
            ) : (
              <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${status.soft} transition group-hover:scale-105`}>
                <span className={`figure text-2xl font-bold ${status.tone}`}>{score}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold text-ink">Business health</h2>
                <span className={`rounded-pill ${status.soft} px-2 py-0.5 text-[11px] font-bold ${status.tone}`}>{status.label}</span>
              </div>
              {changeLine && <p className={`mt-0.5 text-xs font-medium ${scoreChange.current >= (scoreChange.previous || 0) ? "text-risk-low" : "text-risk-high"}`}>{changeLine}</p>}
            </div>
          </div>
        </div>

        {/* Top driver + biggest weakness (collapsed insight) */}
        {(topDriver || weakest) && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {topDriver && (
              <div className="rounded-xl bg-risk-low/5 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-risk-low">Strongest driver</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{COMPONENT_LABELS[topDriver[0]].label}</p>
              </div>
            )}
            {weakest && weakest !== topDriver && (
              <div className="rounded-xl bg-risk-high/5 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-risk-high">Biggest weakness</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{COMPONENT_LABELS[weakest[0]].label}</p>
              </div>
            )}
          </div>
        )}

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {open ? "Hide breakdown" : "View score breakdown"}
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1" style={{ transform: open ? "rotate(90deg)" : "none" }}>→</span>
        </span>
      </button>

      {/* Expandable detail */}
      <div className="overflow-hidden transition-all duration-500 ease-out" style={{ maxHeight: open ? "900px" : "0px", opacity: open ? 1 : 0 }}>
        <div className="space-y-4 px-6 pb-6">
          {entries.map(([key, value]) => {
            const meta = COMPONENT_LABELS[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{meta.label}</span>
                  <span className="figure font-semibold text-ink">{Math.round(value)}%</span>
                </div>
                <div className="mt-1"><Bar value={value} /></div>
                <p className="mt-1 text-[11px] text-ink-muted">{meta.help}</p>
              </div>
            );
          })}

          {weakest && (
            <div className="rounded-xl bg-bg-subtle/60 px-4 py-3">
              <p className="text-sm">
                <span className="font-semibold text-ink">To improve your score:</span>{" "}
                <span className="text-ink-muted">focus on {COMPONENT_LABELS[weakest[0]].label.toLowerCase()} — it&rsquo;s currently your lowest area.</span>
              </p>
            </div>
          )}

          {dataCompleteness != null && (
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <span className="text-xs text-ink-muted">Score confidence</span>
              <span className="figure text-sm font-semibold text-ink">{dataCompleteness}%</span>
            </div>
          )}

          {unavailable.length > 0 && (
            <p className="text-[11px] text-ink-muted">
              {unavailable.length} area{unavailable.length > 1 ? "s" : ""} need{unavailable.length === 1 ? "s" : ""} more data to factor in. Upload more files to complete your score.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default HealthScoreExplainer;
