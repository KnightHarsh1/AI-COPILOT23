import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Info, Activity } from "lucide-react";
import { ExplainTooltip } from "../common/ExplainTooltip";
import ConfidenceIndicator from "../common/ConfidenceIndicator";
import { RiskHeatmap, ForecastTrendChart } from "./IntelVisualizations";

// ModuleIntelligenceCard — one consistent Virtual-CFO layout for any backend
// intelligence module that returns the standard shape: { name, health_score,
// health_band, top_risk, top_opportunity, kpis[], actions[], executive_summary,
// trust }. Self-fetches via the passed `fetcher`. Renders the full trust layer:
// executive summary, KPIs each with "Explain this number", top risk/opp, what/
// how/impact, recommended actions, and data-source/confidence footer.
function bandStyle(band) {
  if (band === "healthy") return { dot: "bg-risk-low", text: "text-risk-low", label: "Healthy" };
  if (band === "watch") return { dot: "bg-gold", text: "text-gold", label: "Watch" };
  if (band === "critical") return { dot: "bg-risk-high", text: "text-risk-high", label: "Critical" };
  return { dot: "bg-ink-muted", text: "text-ink-muted", label: "—" };
}

function ModuleIntelligenceCard({ fetcher, icon: Icon, fallbackName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.resolve(fetcher())
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData({ available: false, reason: "Couldn't load this intelligence." }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [fetcher]);

  if (loading) {
    return <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-muted shadow-card">Loading intelligence…</div>;
  }

  const wid = data?.trust;
  if (!data || !data.available) {
    return (
      <div className="rounded-card border border-border bg-surface p-8 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{Icon && <Icon size={22} />}</span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{data?.name || fallbackName}</h3>
            <p className="text-sm text-ink-muted">{data?.reason || "Import the relevant data to unlock this intelligence."}</p>
          </div>
        </div>
        {wid?.what && <p className="mt-4 text-sm text-ink-muted">{wid.what}</p>}
      </div>
    );
  }

  const band = bandStyle(data.health_band);
  const conf = wid?.confidence;
  const xd = (e) => ({
    title: e.metric, hint: e.formula,
    detail: { formula: e.formula, sources: e.data_sources, records: e.records_used ? `${e.records_used} records` : undefined, confidence: e.confidence ?? conf, lastRefresh: e.last_updated || wid?.last_updated },
  });
  const es = data.executive_summary || {};

  return (
    <div className="space-y-4">
      {/* Header + health + impact */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{Icon && <Icon size={22} />}</span>
            <div>
              <h3 className="font-display text-lg font-bold text-ink">{data.name}</h3>
              {wid?.what && <p className="max-w-xl text-sm text-ink-muted">{wid.what}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {wid?.impact?.level && <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">Impact: {wid.impact.level}</span>}
            <div className="text-right">
              <p className={`figure-value text-2xl font-bold ${band.text}`}>{data.health_score}<span className="text-sm text-ink-muted">/100</span></p>
              <span className="flex items-center justify-end gap-1.5"><span className={`h-2 w-2 rounded-full ${band.dot}`} /><span className={`text-xs font-semibold ${band.text}`}>{band.label}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive summary */}
      {(es.what_happened || es.why || es.what_next) && (
        <div className="rounded-card border border-primary/20 bg-primary/5 p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary"><Activity size={14} /> Executive summary</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            {es.what_happened && <div><dt className="inline font-semibold text-ink">What happened: </dt><dd className="inline text-ink-muted">{es.what_happened}</dd></div>}
            {es.why && <div><dt className="inline font-semibold text-ink">Why: </dt><dd className="inline text-ink-muted">{es.why}</dd></div>}
            {es.what_next && <div><dt className="inline font-semibold text-ink">What to do next: </dt><dd className="inline text-ink-muted">{es.what_next}</dd></div>}
          </dl>
        </div>
      )}

      {/* Risk + opportunity */}
      <div className="grid gap-3 lg:grid-cols-2">
        {data.top_risk && (
          <div className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-risk-high"><AlertTriangle size={14} /> Top risk</p>
            <p className="mt-1 text-sm text-ink">{data.top_risk}</p>
          </div>
        )}
        {data.top_opportunity && (
          <div className="rounded-card border border-risk-low/30 bg-risk-low/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-risk-low"><TrendingUp size={14} /> Top opportunity</p>
            <p className="mt-1 text-sm text-ink">{data.top_opportunity}</p>
          </div>
        )}
      </div>

      {/* KPIs with explain-this-number */}
      {data.kpis?.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.kpis.map((k, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-subtle p-4">
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {k.label}
                {k.explain && <ExplainTooltip title={k.explain.metric || k.label} hint={k.explain.formula} detail={xd(k.explain)} />}
              </div>
              <p className="figure-value mt-1 text-lg font-bold text-ink">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risk breakdown (Risk module) */}
      {data.risk_breakdown?.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h4 className="font-display text-base font-bold text-ink">Risk breakdown</h4>
          <div className="mt-3 space-y-2">
            {data.risk_breakdown.map((b) => {
              const tone = b.level === "high" ? "bg-risk-high" : b.level === "medium" ? "bg-gold" : "bg-risk-low";
              return (
                <div key={b.label} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-ink">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle"><div className={`h-full ${tone}`} style={{ width: `${b.risk}%` }} /></div>
                  <span className="figure-value w-12 shrink-0 text-right text-ink-muted">{b.risk}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scenarios (Forecasting module) */}
      {data.scenarios && (
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h4 className="font-display text-base font-bold text-ink">Scenarios (next period)</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {["revenue", "expenses", "profit"].map((key) => data.scenarios[key] && (
              <div key={key} className="rounded-xl border border-border bg-bg-subtle p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{key}</p>
                <p className="figure-value mt-1 text-sm text-risk-low">Best {Math.round(data.scenarios[key].best).toLocaleString("en-IN")}</p>
                <p className="figure-value text-sm font-bold text-ink">Exp {Math.round(data.scenarios[key].expected).toLocaleString("en-IN")}</p>
                <p className="figure-value text-sm text-risk-high">Worst {Math.round(data.scenarios[key].worst).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast trend + confidence band */}
      {data.history && <ForecastTrendChart history={data.history} scenarios={data.scenarios} />}

      {/* Risk heatmap */}
      {data.risk_breakdown?.length > 0 && <RiskHeatmap breakdown={data.risk_breakdown} />}

      {/* Today / Week / Month focus (Executive module) */}
      {(data.todays_priority || data.weekly_focus || data.monthly_focus) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {[["Today", data.todays_priority], ["This week", data.weekly_focus], ["This month", data.monthly_focus]].map(([label, items]) => (
            <div key={label} className="rounded-card border border-border bg-surface p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {(items || []).length === 0 && <li className="text-ink-muted">Nothing urgent.</li>}
                {(items || []).map((a, i) => <li key={i} className="text-ink">{a.title}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {data.actions?.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h4 className="font-display text-base font-bold text-ink">Recommended actions</h4>
          <ul className="mt-3 space-y-2">
            {data.actions.map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.priority === "high" || a.priority === "critical" ? "bg-risk-high" : "bg-gold"}`} />
                <span className="text-ink">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How it works + trust footer */}
      {wid && (
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted"><Info size={13} className="text-primary" /> How this works</p>
          {wid.how?.logic && <p className="mt-1.5 text-sm text-ink-muted">{wid.how.logic}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            {wid.data_sources?.length > 0 && <span>Sources: {wid.data_sources.join(", ")}</span>}
            {wid.records_used != null && <span>Records: {wid.records_used}</span>}
            {conf != null && <ConfidenceIndicator value={conf} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModuleIntelligenceCard;
