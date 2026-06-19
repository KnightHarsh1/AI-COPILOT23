import { useState } from "react";
import CommandCenterService from "../../services/commandCenterService";

const INDUSTRIES = [
  "manufacturing", "retail", "wholesale", "construction", "textile",
  "plastics", "steel", "food processing", "services",
];

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"];

const GOALS = [
  { value: "grow_revenue", label: "Grow revenue" },
  { value: "improve_margin", label: "Improve margins" },
  { value: "reduce_risk", label: "Reduce risk" },
  { value: "expand", label: "Expand the business" },
];

function BusinessProfileModal({ open, onClose, onSaved }) {
  const [industry, setIndustry] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [goal, setGoal] = useState("grow_revenue");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await CommandCenterService.updateBusinessProfile({
        industry: industry || null,
        upload_frequency: frequency,
        business_goal: goal,
      });
      onSaved?.();
      onClose();
    } catch (_) {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl">
        <h2 className="font-display text-xl font-bold text-ink">Tell us about your business</h2>
        <p className="mt-1 text-sm text-ink-muted">
          This powers your Market Radar and keeps your data fresh with timely reminders.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select your industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">How often do you upload data?</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-muted">We&rsquo;ll remind you when an upload is due.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Main goal right now</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill px-4 py-2 text-sm font-semibold text-ink-muted transition hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BusinessProfileModal;
