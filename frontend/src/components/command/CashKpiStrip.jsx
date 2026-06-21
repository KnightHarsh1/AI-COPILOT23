import { useState } from "react";
import { formatCurrency } from "../../utils/formatters";

const EXPLAIN = {
  cash_position: "Money collected minus money spent — your real operating cash.",
  receivable_days: "Average days customers take to pay. Lower is better.",
  working_capital: "Receivables + stock available to run daily operations.",
  runway_months: "Months your cash lasts if you keep losing at the current rate.",
  vendor_dependency: "Share of spending on one supplier. High means risk.",
  churn_risk: "Share of past customers who stopped buying recently.",
};

// Plain-language verdict so a non-financial owner knows if a number is good
// or bad at a glance. Returns { label, tone } or null.
function verdictFor(metric, value) {
  const v = Number(value);
  if (value == null || Number.isNaN(v)) return null;
  switch (metric) {
    case "cash_position":
    case "working_capital":
      return v > 0 ? { label: "Positive", tone: "low" } : { label: "Negative", tone: "high" };
    case "receivable_days":
      if (v <= 15) return { label: "Fast", tone: "low" };
      if (v <= 45) return { label: "Okay", tone: "medium" };
      return { label: "Slow", tone: "high" };
    case "runway_months":
      if (v === 0) return { label: "Profitable", tone: "low" };
      if (v >= 6) return { label: "Comfortable", tone: "low" };
      if (v >= 3) return { label: "Watch", tone: "medium" };
      return { label: "Tight", tone: "high" };
    case "vendor_dependency":
      if (v <= 30) return { label: "Diversified", tone: "low" };
      if (v <= 60) return { label: "Watch", tone: "medium" };
      return { label: "Concentrated", tone: "high" };
    case "churn_risk":
      if (v <= 15) return { label: "Low", tone: "low" };
      if (v <= 35) return { label: "Watch", tone: "medium" };
      return { label: "High", tone: "high" };
    default:
      return null;
  }
}

const TONE_CLASS = {
  low: "bg-risk-low/10 text-risk-low",
  medium: "bg-gold/10 text-gold",
  high: "bg-risk-high/10 text-risk-high",
};

function fontSizeForLength(text) {
  const len = String(text).length;
  if (len <= 8) return "text-xl";
  if (len <= 11) return "text-lg";
  if (len <= 14) return "text-base";
  return "text-sm";
}

function Cell({ label, value, suffix = "", metric, isCurrency = true }) {
  const [show, setShow] = useState(false);
  const display = isCurrency ? formatCurrency(value) : `${Math.round(value || 0)}${suffix}`;
  const verdict = verdictFor(metric, value);
  return (
    <div className="relative flex flex-col items-center justify-between gap-2 rounded-card border border-border bg-surface p-5 text-center shadow-card transition hover:shadow-card-hover">
      <div className="flex items-center justify-center gap-1">
        <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <button
          type="button"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onFocus={() => setShow(true)}
          onBlur={() => setShow(false)}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[10px] font-bold text-ink-muted"
          aria-label={`What is ${label}?`}
        >
          ?
        </button>
      </div>
      <p className={`figure font-bold leading-none text-ink whitespace-nowrap ${fontSizeForLength(display)}`}>{display}</p>
      {verdict ? (
        <span className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[verdict.tone]}`}>
          {verdict.label}
        </span>
      ) : (
        <span className="h-[18px]" />
      )}
      {show && (
        <span className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-surface shadow-lg">
          {EXPLAIN[metric]}
        </span>
      )}
    </div>
  );
}

function CashKpiStrip({ health }) {
  const h = health || {};
  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Cash &amp; working capital</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Cell label="Cash position" value={h.cash_position} metric="cash_position" />
        <Cell label="Working capital" value={h.working_capital} metric="working_capital" />
        <Cell label="Receivable days" value={h.receivable_days} metric="receivable_days" suffix="d" isCurrency={false} />
        <Cell label="Cash runway" value={h.runway_months} metric="runway_months" suffix="mo" isCurrency={false} />
        <Cell label="Vendor dependency" value={h.vendor_dependency} metric="vendor_dependency" suffix="%" isCurrency={false} />
        <Cell label="Churn risk" value={h.churn_risk} metric="churn_risk" suffix="%" isCurrency={false} />
      </div>
    </section>
  );
}

export default CashKpiStrip;
