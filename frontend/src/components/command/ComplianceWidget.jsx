import { useState } from "react";
import Drawer from "./Drawer";
import ScoreGauge from "../common/charts/ScoreGauge";

const STATUS_STYLES = {
  overdue: "bg-risk-high/10 text-risk-high",
  due_soon: "bg-risk-medium/10 text-risk-medium",
  upcoming: "bg-bg-subtle text-ink-muted",
  filed: "bg-risk-low/10 text-risk-low",
};

function ComplianceWidget({ data, onSetup }) {
  const [open, setOpen] = useState(false);

  if (!data?.available) {
    return (
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="text-base font-semibold text-ink">Compliance</span>
        <p className="mt-3 text-sm text-ink-muted">{data?.reason || "No compliance data yet."}</p>
        {data?.needs_setup && (
          <button
            type="button"
            onClick={onSetup}
            className="mt-3 rounded-pill bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
          >
            Add GSTIN
          </button>
        )}
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
          <span className="text-base font-semibold text-ink">Compliance</span>
          <span className="text-xs font-semibold text-primary">Details →</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <ScoreGauge score={data.compliance_score} size={96} label="Compliance" />
          <div className="space-y-1">
            {data.overdue_count > 0 && (
              <p className="text-sm font-semibold text-risk-high">{data.overdue_count} overdue</p>
            )}
            {data.due_soon_count > 0 && (
              <p className="text-sm font-semibold text-risk-medium">{data.due_soon_count} due soon</p>
            )}
            {data.overdue_count === 0 && data.due_soon_count === 0 && (
              <p className="text-sm font-semibold text-risk-low">All clear</p>
            )}
            <p className="text-xs text-ink-muted">Next filings tracked</p>
          </div>
        </div>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Compliance Intelligence"
        subtitle="GST, TDS, and tax deadlines — never miss a filing."
      >
        <div className="space-y-6">
          {data.overdue?.length > 0 && (
            <DeadlineBlock title="Overdue" items={data.overdue} />
          )}
          <DeadlineBlock title="Coming up" items={data.upcoming} empty="No upcoming deadlines in the tracked window." />
          <p className="rounded-xl border border-border bg-bg-subtle px-4 py-2 text-xs text-ink-muted">
            Dates are standard statutory due dates and may shift with government notifications. Not tax advice.
          </p>
        </div>
      </Drawer>
    </>
  );
}

function DeadlineBlock({ title, items, empty }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      {!items || items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-ink">{d.title}</p>
                <p className="text-xs text-ink-muted">Due {d.due_date}</p>
              </div>
              <span className={`rounded-pill px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[d.status] || STATUS_STYLES.upcoming}`}>
                {d.status === "due_soon" ? `${d.days_remaining}d left` : d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ComplianceWidget;
