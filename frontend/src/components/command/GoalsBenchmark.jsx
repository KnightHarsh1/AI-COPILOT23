import { useState } from "react";
import GrowthService from "../../services/growthService";
import { formatCurrency } from "../../utils/formatters";

function GoalBar({ goal }) {
  const pct = Math.min(goal.progress_pct, 100);
  const color = goal.progress_pct >= 100 ? "bg-risk-low" : goal.progress_pct >= 70 ? "bg-primary" : "bg-risk-medium";
  const label = { revenue: "Revenue", profit: "Profit", collection: "Collections" }[goal.goal_type] || goal.goal_type;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label} goal</span>
        <span className="text-ink-muted">{formatCurrency(goal.actual)} / {formatCurrency(goal.target_amount)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {goal.progress_pct}% {goal.gap > 0 ? `· ${formatCurrency(goal.gap)} to go` : "· achieved 🎉"}
      </p>
    </div>
  );
}

function GoalsBenchmark({ goals, benchmark, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState({ revenue: "", profit: "", collection: "" });

  const save = async () => {
    for (const t of ["revenue", "profit", "collection"]) {
      if (vals[t]) await GrowthService.upsertGoal({ goal_type: t, target_amount: parseFloat(vals[t]) });
    }
    setEditing(false);
    onChanged?.();
  };

  const hasGoals = goals?.available && goals.goals?.length > 0;

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Your goals</h2>
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs font-semibold text-primary">
            {editing ? "Cancel" : hasGoals ? "Edit" : "Set goals"}
          </button>
        </div>
        {editing ? (
          <div className="mt-4 space-y-3">
            {["revenue", "profit", "collection"].map((t) => (
              <label key={t} className="block">
                <span className="text-sm capitalize text-ink-muted">{t} target (₹)</span>
                <input type="number" value={vals[t]} onChange={(e) => setVals({ ...vals, [t]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none" />
              </label>
            ))}
            <button type="button" onClick={save} className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
              Save goals
            </button>
          </div>
        ) : hasGoals ? (
          <div className="mt-4 space-y-4">
            {goals.goals.map((g) => <GoalBar key={g.id} goal={g} />)}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Set monthly targets to track your progress at a glance.</p>
        )}
      </div>

      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-ink">How you compare</h2>
        {benchmark?.available && benchmark.items?.length > 0 ? (
          <>
            <div className="mt-4 space-y-3">
              {benchmark.items.map((b) => (
                <div key={b.metric} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-ink-muted">{b.metric.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{b.your_value}{b.metric.includes("margin") || b.metric.includes("rate") ? "%" : ""}</span>
                    <span className="text-xs text-ink-muted">vs ~{b.typical}{b.metric.includes("margin") || b.metric.includes("rate") ? "%" : ""}</span>
                    <span className={`h-2 w-2 rounded-full ${b.status === "good" ? "bg-risk-low" : b.status === "watch" ? "bg-risk-medium" : "bg-risk-high"}`} />
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              {benchmark.industry ? `Typical ${benchmark.industry} SME benchmarks` : "Generic SME benchmarks"} · indicative only
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Set your industry in Settings to compare against peers.</p>
        )}
      </div>
    </section>
  );
}

export default GoalsBenchmark;
