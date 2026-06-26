import { useState, useEffect } from "react";
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Clock, Info } from "lucide-react";
import CommandCenterService from "../../services/commandCenterService";
import { formatCurrency } from "../../utils/formatters";
import { ExplainTooltip } from "../common/ExplainTooltip";
import ConfidenceIndicator from "../common/ConfidenceIndicator";

// Banking & Liquidity Intelligence — CFO-grade cash forecasting from real
// uploaded data (sales, expenses, bank). Self-fetches from /banking-liquidity.
// No fabricated values: when the API reports unavailable, the card explains
// what to upload.
function Score({ value }) {
  const tone = value >= 75 ? "text-risk-low" : value >= 50 ? "text-gold" : "text-risk-high";
  return <span className={`figure-value text-3xl font-bold ${tone}`}>{value}<span className="text-base text-ink-muted">/100</span></span>;
}

function Stat({ label, value, explain }) {
  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-3">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
        {explain && <ExplainTooltip title={explain.title} hint={explain.hint} detail={explain.detail} />}
      </div>
      <p className="figure-value mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function BankingLiquidityCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    CommandCenterService.getBankingLiquidity()
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData({ available: false, reason: "Couldn't load liquidity intelligence." }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-muted shadow-card">Loading liquidity intelligence…</div>;
  }

  const wid = data?.what_it_does;
  if (!data || !data.available) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Wallet size={22} /></span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Banking &amp; Liquidity Intelligence</h3>
            <p className="text-sm text-ink-muted">{data?.reason || "Import your Sales Register, Expenses and Bank Statement to unlock cash forecasting."}</p>
          </div>
        </div>
        {wid && <p className="mt-4 text-sm text-ink-muted">{wid.what}</p>}
      </div>
    );
  }

  const s = data.summary;
  const win = data.expected_collections.by_window;
  const f30 = data.cash_forecast_30d;
  const neg = data.negative_cash;
  const trust = data.trust;
  const conf = trust?.confidence;
  const detail = (extra) => ({ dateRange: "Forward 90 days", confidence: conf, lastRefresh: trust?.last_updated, sources: trust?.data_sources, ...extra });

  return (
    <div className="space-y-4">
      {/* Header + what/how/impact */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Wallet size={22} /></span>
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Banking &amp; Liquidity Intelligence</h3>
              <p className="text-sm text-ink-muted">{wid?.what}</p>
            </div>
          </div>
          <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">Impact: {wid?.impact?.level}</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-subtle p-4">
            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Liquidity score
              <ExplainTooltip title="Liquidity Score" hint="0–100 from cash, receivables, collection speed, working capital and upcoming expenses." detail={detail({ formula: "Weighted: runway + collection speed + overdue concentration + near-term coverage" })} />
            </div>
            <div className="mt-1"><Score value={s.liquidity_score} /></div>
          </div>
          <Stat label="Cash runway" value={s.runway_days != null ? `${s.runway_days} days` : "—"} explain={{ title: "Cash Runway", hint: "Available cash ÷ average monthly burn.", detail: detail({ formula: "available_cash / (avg monthly expense / 30)" }) }} />
          <Stat label="Expected (15d)" value={formatCurrency(win["15d"])} explain={{ title: "Expected Collections (15 days)", hint: "Probability-weighted receivables expected within 15 days.", detail: detail({ formula: "Σ invoice_outstanding × collection_probability (expected ≤ 15d)" }) }} />
          <Stat label="Outstanding" value={formatCurrency(s.total_outstanding)} explain={{ title: "Total Outstanding", hint: "Sum of unpaid invoice balances.", detail: detail({ formula: "Σ (amount − amount_paid) for open invoices" }) }} />
        </div>
      </div>

      {/* Risk + opportunity */}
      <div className="grid gap-3 lg:grid-cols-2">
        {data.top_risk && (
          <div className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-risk-high"><AlertTriangle size={14} /> Top cash risk</p>
            <p className="mt-1 text-sm text-ink">{data.top_risk}</p>
          </div>
        )}
        {data.top_opportunity && (
          <div className="rounded-card border border-risk-low/30 bg-risk-low/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-risk-low"><TrendingUp size={14} /> Top cash opportunity</p>
            <p className="mt-1 text-sm text-ink">{data.top_opportunity}</p>
          </div>
        )}
      </div>

      {/* 30-day cash forecast */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h4 className="font-display flex items-center gap-1.5 text-base font-bold text-ink">
          30-day cash forecast
          <ExplainTooltip title="Cash Forecast" hint="Opening cash plus expected collections minus expected expenses." detail={detail({ formula: "opening + expected_collections − expected_expenses", records: `${trust?.invoices_used} invoices` })} />
        </h4>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><p className="text-xs text-ink-muted">Opening cash</p><p className="figure-value text-lg font-bold text-ink">{formatCurrency(f30.opening_cash)}</p></div>
          <div><p className="text-xs text-ink-muted">+ Collections</p><p className="figure-value text-lg font-bold text-risk-low">{formatCurrency(f30.expected_collections)}</p></div>
          <div><p className="text-xs text-ink-muted">− Expenses</p><p className="figure-value text-lg font-bold text-risk-high">{formatCurrency(f30.expected_expenses)}</p></div>
          <div><p className="text-xs text-ink-muted">Projected cash</p><p className="figure-value text-lg font-bold text-primary">{formatCurrency(f30.projected_cash)}</p></div>
        </div>
        {neg?.will_go_negative && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-risk-high/30 bg-risk-high/5 p-3">
            <TrendingDown size={16} className="mt-0.5 text-risk-high" />
            <p className="text-sm text-ink">Cash may turn <span className="font-semibold text-risk-high">negative around {neg.date}</span> (shortfall ≈ {formatCurrency(neg.amount)}). {neg.reason}</p>
          </div>
        )}
        {/* horizon bars */}
        <div className="mt-4 space-y-2">
          {data.cash_forecast.map((row) => (
            <div key={row.horizon} className="flex items-center justify-between gap-3 text-sm">
              <span className="w-16 shrink-0 text-ink-muted">{row.horizon}</span>
              <div className="flex flex-1 items-center gap-2">
                <span className="figure-value text-risk-low">{formatCurrency(row.expected_collections)}</span>
                <span className="text-ink-muted">in</span>
                <span className="figure-value text-ink">{formatCurrency(row.closing_cash)}</span>
                <span className="text-xs text-ink-muted">closing</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer payment behaviour */}
      {data.customers?.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h4 className="font-display flex items-center gap-1.5 text-base font-bold text-ink"><Clock size={16} className="text-primary" /> Customer payment behaviour</h4>
          <div className="mt-3 space-y-2">
            {data.customers.slice(0, 8).map((c) => {
              const tone = c.risk === "High" ? "text-risk-high" : c.risk === "Medium" ? "text-gold" : "text-risk-low";
              return (
                <div key={c.customer} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">{c.customer}</span>
                  <span className="figure-value text-ink-muted">{c.avg_days_to_pay}d</span>
                  <span className="hidden sm:inline text-ink-muted">{c.category}</span>
                  <span className={`text-xs font-semibold ${tone}`}>{c.risk}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High-priority actions */}
      {data.actions?.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h4 className="font-display text-base font-bold text-ink">Recommended actions</h4>
          <ul className="mt-3 space-y-2">
            {data.actions.map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.priority === "high" ? "bg-risk-high" : "bg-gold"}`} />
                <span className="text-ink">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How it works + trust */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted"><Info size={13} className="text-primary" /> How this works</p>
        <p className="mt-1.5 text-sm text-ink-muted">{wid?.how?.logic}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span>Sources: {trust?.data_sources?.join(", ")}</span>
          <span>Invoices: {trust?.invoices_used}</span>
          <span>Customers: {trust?.customers_used}</span>
          {conf != null && <ConfidenceIndicator value={conf} />}
        </div>
      </div>
    </div>
  );
}

export default BankingLiquidityCard;
