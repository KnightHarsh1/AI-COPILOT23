import { useState } from "react";
import Drawer from "./Drawer";
import ScoreGauge from "../common/charts/ScoreGauge";
import { formatCurrency, formatCurrencyCompact } from "../../utils/formatters";

const AGING_LABELS = {
  current: "Not due yet",
  d1_30: "1–30 days",
  d31_60: "31–60 days",
  d61_90: "61–90 days",
  d90_plus: "90+ days",
};

function CollectionsWidget({ data }) {
  const [open, setOpen] = useState(false);

  if (!data?.available) {
    return (
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink">Collections</span>
        </div>
        <p className="mt-3 text-sm text-ink-muted">{data?.reason || "No collections data yet."}</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full flex-col rounded-card border border-border bg-surface p-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-ink">Collections</span>
          <span className="text-xs font-semibold text-primary">Details →</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <ScoreGauge score={data.credit_health_score} size={96} label="Credit health" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-ink-muted">Outstanding</p>
            <p className="figure truncate text-lg font-bold text-ink" title={formatCurrency(data.outstanding_receivables)}>
              {formatCurrencyCompact(data.outstanding_receivables)}
            </p>
            <p className="text-xs text-ink-muted">{data.collection_efficiency}% collected</p>
          </div>
        </div>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Collections Intelligence"
        subtitle="How fast you're getting paid, and what's stuck."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Cash sales" value={formatCurrency(data.cash_sales)} />
            <Stat label="Credit sales" value={formatCurrency(data.credit_sales)} />
            <Stat label="Total billed" value={formatCurrency(data.total_billed)} />
            <Stat label="Collected" value={formatCurrency(data.total_collected)} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Receivable aging</h3>
            <div className="space-y-2">
              {Object.entries(data.aging || {}).map(([bucket, amount]) => (
                <div key={bucket} className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2 text-sm">
                  <span className="text-ink-muted">{AGING_LABELS[bucket] || bucket}</span>
                  <span className={`figure font-semibold ${bucket === "d90_plus" && amount > 0 ? "text-risk-high" : "text-ink"}`}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {data.top_customer_name && (
            <div className="rounded-xl border border-border bg-bg-subtle p-4">
              <p className="text-sm font-semibold text-ink">Customer dependency</p>
              <p className="mt-1 text-sm text-ink-muted">
                {data.top_customer_name} accounts for{" "}
                <span className={data.top_customer_share > 40 ? "font-semibold text-risk-medium" : "font-semibold text-ink"}>
                  {data.top_customer_share}%
                </span>{" "}
                of your revenue.
                {data.top_customer_share > 40 && " Consider diversifying to reduce risk."}
              </p>
            </div>
          )}

          {data.sales_missing_payment_data > 0 && (
            <p className="rounded-xl border border-risk-medium/20 bg-risk-medium/5 px-4 py-3 text-xs text-risk-medium">
              {data.sales_missing_payment_data} sale(s) are missing payment data. Re-import with due-date and
              payment-status columns to make these numbers complete.
            </p>
          )}
        </div>
      </Drawer>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-bg-subtle px-3 py-2">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="figure mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  );
}

export default CollectionsWidget;
