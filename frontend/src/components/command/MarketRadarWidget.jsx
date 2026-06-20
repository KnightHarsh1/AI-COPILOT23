import { useState } from "react";
import Drawer from "./Drawer";
import ScoreGauge from "../common/charts/ScoreGauge";
import CommandCenterService from "../../services/commandCenterService";
import { formatCurrencyCompact } from "../../utils/formatters";

function ImpactRange({ low, high }) {
  if (low == null || high == null) return null;
  return (
    <span className="figure text-xs font-semibold text-ink">
      {formatCurrencyCompact(low)}–{formatCurrencyCompact(high)}
    </span>
  );
}

function InsightCard({ insight, onAct, onDismiss, busy }) {
  const isThreat = insight.direction === "threat";
  return (
    <div className={`rounded-xl border p-4 ${isThreat ? "border-risk-high/20 bg-risk-high/5" : "border-risk-low/20 bg-risk-low/5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isThreat ? "bg-risk-high/15 text-risk-high" : "bg-risk-low/15 text-risk-low"}`}>
            {isThreat ? "Threat" : "Opportunity"}
          </span>
          <p className="mt-1.5 text-sm font-semibold text-ink">{insight.headline}</p>
        </div>
        <ImpactRange low={insight.impact_low} high={insight.impact_high} />
      </div>
      <p className="mt-2 text-sm text-ink-muted">{insight.why_it_matters}</p>
      {insight.recommended_action && (
        <p className="mt-2 text-sm">
          <span className="font-medium text-ink">Do: </span>
          <span className="text-ink-muted">{insight.recommended_action}</span>
        </p>
      )}
      {Array.isArray(insight.match_reasons) && insight.match_reasons.length > 0 && (
        <p className="mt-2 text-xs text-ink-muted">Why you: {insight.match_reasons.join(" · ")}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAct(insight.id)}
          className="rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
        >
          Add to my actions
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDismiss(insight.id)}
          className="rounded-pill px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-bg-subtle disabled:opacity-50"
        >
          Dismiss
        </button>
        {insight.source_name && (
          <span className="ml-auto truncate text-[10px] text-ink-muted">{insight.source_name}</span>
        )}
      </div>
    </div>
  );
}

function MarketRadarWidget({ data, onSetup, onChanged }) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (!data?.available) {
    return (
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="text-base font-semibold text-ink">Market Radar</span>
        <p className="mt-3 text-sm text-ink-muted">{data?.reason || "Market radar not available yet."}</p>
        {data?.locked && (
          <a href="/app/settings"
            className="mt-3 inline-block rounded-pill bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover">
            Upgrade to unlock
          </a>
        )}
        {data?.needs_industry && (
          <button
            type="button"
            onClick={onSetup}
            className="mt-3 rounded-pill bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
          >
            Set my industry
          </button>
        )}
      </div>
    );
  }

  const score = data.preparedness?.score;

  const handleAct = async (id) => {
    setBusyId(id);
    try {
      await CommandCenterService.actOnMarketInsight(id);
      onChanged?.();
    } catch (_) { /* non-fatal */ }
    setBusyId(null);
  };

  const handleDismiss = async (id) => {
    setBusyId(id);
    try {
      await CommandCenterService.dismissMarketInsight(id);
      onChanged?.();
    } catch (_) { /* non-fatal */ }
    setBusyId(null);
  };

  const allInsights = [...(data.top_threats || []), ...(data.top_opportunities || [])];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full flex-col rounded-card border border-border bg-surface p-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-ink">Market Radar</span>
          <span className="text-xs font-semibold text-primary">Details →</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          {score != null ? (
            <ScoreGauge score={score} size={96} label="Preparedness" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bg-subtle text-xs text-ink-muted">
              No score
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-risk-high">{data.threat_count} threat{data.threat_count === 1 ? "" : "s"}</p>
            <p className="text-sm font-semibold text-risk-low">{data.opportunity_count} opportunit{data.opportunity_count === 1 ? "y" : "ies"}</p>
            <p className="text-xs text-ink-muted">What&rsquo;s happening outside</p>
          </div>
        </div>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Market Intelligence Radar"
        subtitle="What's happening outside your business — and what to do about it."
      >
        <div className="space-y-6">
          {score != null && (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-subtle p-4">
              <ScoreGauge score={score} size={84} label="Preparedness" />
              <p className="text-sm text-ink-muted">
                Your market preparedness reflects how exposed you are to current threats and how
                ready you are to capture opportunities in your industry.
              </p>
            </div>
          )}

          {allInsights.length === 0 ? (
            <p className="text-sm text-ink-muted">No active market signals for your industry right now.</p>
          ) : (
            <div className="space-y-3">
              {data.top_threats?.map((i) => (
                <InsightCard key={i.id} insight={i} onAct={handleAct} onDismiss={handleDismiss} busy={busyId === i.id} />
              ))}
              {data.top_opportunities?.map((i) => (
                <InsightCard key={i.id} insight={i} onAct={handleAct} onDismiss={handleDismiss} busy={busyId === i.id} />
              ))}
            </div>
          )}

          <p className="rounded-xl border border-border bg-bg-subtle px-4 py-2 text-xs text-ink-muted">
            Insights are matched to your industry and estimated against your own numbers. Impact
            ranges are indicative, not guarantees.
          </p>
        </div>
      </Drawer>
    </>
  );
}

export default MarketRadarWidget;
