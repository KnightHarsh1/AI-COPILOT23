import { useState } from "react";
import CommandCenterService from "../../services/commandCenterService";

function ComplianceSetupModal({ open, onClose, onSaved }) {
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await CommandCenterService.updateComplianceProfile({
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        gst_filing_frequency: frequency,
        compliance_enabled: true,
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
        <h2 className="font-display text-xl font-bold text-ink">Set up compliance tracking</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Add your GSTIN to auto-generate GST, TDS, and tax filing reminders.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">GSTIN</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              maxLength={15}
              placeholder="e.g. 09ABCDE1234F1Z5"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">PAN (optional)</label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="e.g. ABCDE1234F"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">GST filing frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
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
            {saving ? "Saving…" : "Save & generate calendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComplianceSetupModal;
