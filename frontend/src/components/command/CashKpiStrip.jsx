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

function Cell({ label, value, suffix = "", metric, isCurrency = true }) {
  const [show, setShow] = useState(false);
  const display = isCurrency ? formatCurrency(value) : `${Math.round(value || 0)}${suffix}`;
  return (
    <div className="relative rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <button type="button" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
          onFocus={() => setShow(true)} onBlur={() => setShow(false)}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-bg-subtle text-[10px] font-bold text-ink-muted">?</button>
      </div>
      <p className="figure mt-2 text-xl font-bold text-ink" style={{ wordBreak: "break-word" }}>{display}</p>
      {show && (
        <span className="absolute left-5 top-full z-10 mt-1 w-56 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-surface shadow-lg">
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
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
