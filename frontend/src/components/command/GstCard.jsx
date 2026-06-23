import { formatCurrency } from "../../utils/formatters";

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

function GstCard({ gst }) {
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
          <p className="truncate text-xs font-medium text-ink-muted">Output GST</p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(liability.output_tax || 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="truncate text-xs font-medium text-ink-muted">CGST</p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(liability.cgst || 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="truncate text-xs font-medium text-ink-muted">SGST</p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(liability.sgst || 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <p className="truncate text-xs font-medium text-ink-muted">IGST</p>
          <p className="figure mt-0.5 text-lg font-bold text-ink">{formatCurrency(liability.igst || 0)}</p>
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
    </section>
  );
}

export default GstCard;
