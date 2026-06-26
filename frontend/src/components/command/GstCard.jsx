import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatters";
import { ExplainTooltip } from "../common/ExplainTooltip";
import TrustFooter from "./TrustFooter";
import HealthImpactBadge from "./HealthImpactBadge";
import CommandCenterService from "../../services/commandCenterService";

// GST Intelligence widget — renders only when GST R1 data has been uploaded
// (data.gst.available). Shows output GST liability, a GST health score, risk
// alerts, the monthly tax trend, and filing readiness. All live from
// GSTIntelligenceService.

const TONE_CLASS = { good: "text-risk-low", bad: "text-risk-high", neutral: "text-ink" };

function ScoreBadge({ score }) {
  const v = Math.round(score || 0);
  const cls = v >= 70 ? "bg-risk-low/10 text-risk-low" : v >= 45 ? "bg-gold/10 text-gold" : "bg-risk-high/10 text-risk-high";
  return <span className={`figure rounded-pill px-2.5 py-1 text-sm font-bold ${cls}`}>{v}/100</span>;
}

function GstCard({ gst, healthImpact }) {
  if (!gst || !gst.available) return null;
  const liability = gst.liability || {};
  const alerts = gst.alerts || [];
  const trend = gst.trend || [];
  const readiness = gst.filing_readiness || {};
  const maxTax = trend.length ? Math.max(...trend.map((t) => t.tax || 0)) : 0;

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card lift hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">GST Intelligence</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{gst.invoice_count} invoices · {gst.effective_tax_rate != null ? `${gst.effective_tax_rate}% effective rate` : "rate n/a"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">GST health</span>
          <ScoreBadge score={gst.gst_health_score} />
        </div>
      </div>

      {/* Liability breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-muted">Output GST
            <ExplainTooltip title="Output GST" hint="GST collected on sales (GSTR-1)." detail={{ formula: "Σ tax on outward supplies", sources: ["GST R1"], confidence: 85 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(liability.output_tax || 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-muted">Input tax credit
            <ExplainTooltip title="Input Tax Credit" hint="GST paid on purchases, available to offset." detail={{ formula: "Σ GST on purchases (from GST-categorised expenses)", sources: ["Expenses"], confidence: 55 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{liability.input_tax_credit != null ? formatCurrency(liability.input_tax_credit) : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-muted">Net liability
            <ExplainTooltip title="Net GST Liability" hint="What you actually owe after ITC." detail={{ formula: "output GST − input tax credit", sources: ["GST R1", "Expenses"], confidence: 60 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(liability.net_liability != null ? liability.net_liability : (liability.output_tax || 0))}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="flex items-center gap-1 truncate text-xs font-medium text-ink-muted">ITC utilization
            <ExplainTooltip title="ITC Utilization %" hint="Share of output tax offset by credit." detail={{ formula: "input tax credit / output GST × 100", sources: ["GST R1", "Expenses"], confidence: 55 }} />
          </p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{liability.itc_utilization_pct != null ? `${liability.itc_utilization_pct}%` : "—"}</p>
        </div>
      </div>
      {liability.note && <p className="mt-2 text-[11px] text-ink-muted">{liability.note}</p>}

      {/* Filing readiness */}
      {readiness && readiness.checks && (
        <div className="mt-4 rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Filing readiness</p>
            <span className={`text-sm font-bold ${readiness.score === 100 ? "text-risk-low" : "text-gold"}`}>{readiness.status}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {readiness.checks.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={c.ok ? "text-risk-low" : "text-ink-muted"}>{c.ok ? "✓" : "○"}</span>
                <span className={c.ok ? "text-ink" : "text-ink-muted"}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Monthly tax trend */}
      {trend.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Monthly GST trend</p>
          <div className="mt-2 space-y-1.5">
            {trend.slice(-6).map((t, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">{t.month}</span>
                  <span className="figure font-semibold text-ink">{formatCurrency(t.tax || 0)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${maxTax ? ((t.tax || 0) / maxTax) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk alerts */}
      {alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {alerts.map((a, i) => {
            const tone = a.severity === "high" ? "bad" : a.severity === "medium" ? "neutral" : "good";
            return (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-bg-subtle px-4 py-2.5">
                <span className={`mt-0.5 text-sm font-bold ${TONE_CLASS[tone]}`}>
                  {a.severity === "high" ? "!" : "•"}
                </span>
                <p className="min-w-0 text-sm">
                  <span className="font-semibold text-ink">{a.title}.</span>{" "}
                  <span className="text-ink-muted">{a.detail}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
      <GstReconciliationPanel />

      <HealthImpactBadge points={healthImpact} />
      <TrustFooter
        sources={["GST R1", "Expenses"]}
        confidence={Math.round(gst.gst_health_score || 0) >= 70 ? 80 : 60}
        lastUpdated={gst.last_updated || gst.period || "Latest import"}
        explanation="GST liability and ITC are computed from your uploaded GST R1 returns and GST-categorised expenses."
        assumptions={liability.input_tax_credit == null ? "ITC derived from expenses; upload a purchase/GSTR-2B file for exact ITC." : undefined}
        warning={gst.alerts && gst.alerts.length ? `${gst.alerts.length} GST alert(s) detected` : undefined}
      />
    </section>
  );
}

// GSTR-1 vs GSTR-2B/3B reconciliation. Self-fetches; shows the per-period
// output-vs-ITC table when purchase data exists, otherwise a prompt to upload
// purchases (never fabricates ITC).
function GstReconciliationPanel() {
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    CommandCenterService.getGstReconciliation()
      .then((d) => { if (alive) setRec(d); })
      .catch(() => { if (alive) setRec(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!rec) return null;

  if (!rec.available) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-bg-subtle px-4 py-3">
        <p className="text-sm font-semibold text-ink">GSTR-1 vs GSTR-2B reconciliation</p>
        <p className="mt-1 text-xs text-ink-muted">{rec.reason}</p>
      </div>
    );
  }

  const s = rec.summary;
  return (
    <div className="mt-4 rounded-xl border border-border bg-bg-subtle p-4">
      <p className="flex items-center gap-1 text-sm font-semibold text-ink">GSTR-1 vs GSTR-2B reconciliation
        <ExplainTooltip title="GST Reconciliation" hint="Outward tax (GSTR-1) vs input credit (GSTR-2B)." detail={{ formula: "output tax − input tax credit, per period", sources: ["Sales", "Purchases"], confidence: 78 }} />
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><p className="text-[11px] text-ink-muted">Output GST</p><p className="figure text-sm font-bold text-ink">{formatCurrency(s.output_tax)}</p></div>
        <div><p className="text-[11px] text-ink-muted">ITC</p><p className="figure text-sm font-bold text-risk-low">{formatCurrency(s.input_tax_credit)}</p></div>
        <div><p className="text-[11px] text-ink-muted">Net payable</p><p className="figure text-sm font-bold text-ink">{formatCurrency(s.net_liability)}</p></div>
        <div><p className="text-[11px] text-ink-muted">Mismatches</p><p className={`figure text-sm font-bold ${s.mismatch_count > 0 ? "text-risk-high" : "text-risk-low"}`}>{s.mismatch_count}</p></div>
      </div>
      {rec.rows?.length > 0 && (
        <div className="mt-3 space-y-1">
          {rec.rows.slice(0, 6).map((r) => (
            <div key={r.period} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-ink-muted">{r.period}</span>
              <span className="figure text-ink">{formatCurrency(r.output_tax)} out</span>
              <span className="figure text-risk-low">{formatCurrency(r.input_tax_credit)} ITC</span>
              <span className={`font-semibold ${r.status === "matched" ? "text-risk-low" : r.status === "payable" ? "text-ink" : "text-gold"}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GstCard;
