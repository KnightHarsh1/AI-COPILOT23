import { useEffect, useState } from "react";
import ReportService from "../../services/reportService";
import StatCard from "../common/StatCard";

function RiskOppList({ title, items, tone }) {
  const toneCls = tone === "risk"
    ? "border-risk-high/20 bg-risk-high/5"
    : "border-risk-low/20 bg-risk-low/5";
  const badgeCls = tone === "risk" ? "text-risk-high" : "text-risk-low";

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {(!items || items.length === 0) ? (
        <p className="mt-3 text-sm text-ink-muted">Nothing notable right now.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item, i) => (
            <div key={i} className={`rounded-xl border p-3 ${toneCls}`}>
              <p className={`text-sm font-semibold ${badgeCls}`}>{item.title}</p>
              {item.detail && <p className="mt-1 text-sm text-ink-muted">{item.detail}</p>}
              {item.action && (
                <p className="mt-1 text-xs text-ink">
                  <span className="font-medium">Action: </span>{item.action}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExecutiveReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ReportService.getExecutiveReport()
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-border bg-surface p-12">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-sm text-ink-muted">
        Executive report could not be loaded. Try refreshing.
      </div>
    );
  }

  const p = report.performance || {};

  return (
    <div className="space-y-6">
      {/* Executive summary headline */}
      <section className="rounded-card border border-primary/20 bg-primary/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Executive summary</p>
        <p className="mt-2 text-lg font-medium leading-7 text-ink">{report.executive_summary}</p>
        <p className="mt-3 text-xs text-ink-muted">Generated {report.generated_at}</p>
      </section>

      {/* Performance snapshot */}
      <section>
        <h2 className="font-display mb-3 text-lg font-semibold text-ink">Business performance</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue (30d)" value={p.revenue} trend={p.growth_rate} />
          <StatCard label="Net profit (30d)" value={p.net_profit} accent={p.net_profit >= 0 ? "text-risk-low" : "text-risk-high"} />
          <StatCard label="Expenses (30d)" value={p.expenses} />
          <StatCard label="Health score" value={`${Math.round(p.health_score || 0)}/100`} isCurrency={false} />
        </div>
      </section>

      {/* Risks + opportunities side by side */}
      <section className="grid gap-6 lg:grid-cols-2">
        <RiskOppList title="Key risks" items={report.key_risks} tone="risk" />
        <RiskOppList title="Key opportunities" items={report.key_opportunities} tone="opp" />
      </section>

      {/* AI insights */}
      {report.insights?.length > 0 && (
        <section className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink">AI-generated insights</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {report.insights.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-bg-subtle/50 p-4">
                <p className="text-sm font-semibold text-ink">{item.issue}</p>
                <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Why:</span> {item.cause}</p>
                <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Do:</span> {item.recommendation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended actions */}
      {report.recommended_actions?.length > 0 && (
        <section className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink">Recommended actions</h2>
          <ol className="space-y-2">
            {report.recommended_actions.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-ink">{a.title}</span>
                  <span className="text-ink-muted"> — {a.recommended_action}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export default ExecutiveReport;
