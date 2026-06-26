import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Calculator, Calendar, Clock, FileText, Activity } from "lucide-react";
import ConfidenceIndicator from "./ConfidenceIndicator";

// DrillDownDrawer — a right-side slide-in panel that fully explains a number:
// data source, records used, formula, date range, contributing transactions,
// calculation logic, confidence, and last refresh. Renders only the metadata it
// is given; missing fields are simply omitted (graceful degradation). No data
// is fabricated — callers pass whatever the existing API already exposes.
function Field({ icon: Icon, label, children }) {
  if (children == null || children === "") return null;
  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <div className="mt-0.5 text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

function DrillDownDrawer({ open, onClose, title, detail }) {
  const d = detail || {};
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (typeof window !== "undefined" && window.__EXPLAIN_DEBUG && open) {
    console.log(`[DrillDownDrawer:${title || "?"}] render #${renderCount.current} open=${open}`);
  }
  // Lock background scroll while the drawer is open so the page behind can't
  // scroll or emit layout/scroll events (which previously fed a reposition
  // loop in the explain popover). Restored on close/unmount.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            style={{ isolation: "isolate", willChange: "opacity" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Explain this number</p>
                <h3 className="font-display truncate text-lg font-bold text-ink">{title || "Metric details"}</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-bg-subtle hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-2">
              {d.value != null && (
                <div className="my-3 rounded-card border border-border bg-bg-subtle p-4">
                  <p className="text-xs font-medium text-ink-muted">{d.valueLabel || "Current value"}</p>
                  <p className="figure mt-1 text-2xl font-bold text-ink">{d.value}</p>
                  {d.confidence != null && <div className="mt-2"><ConfidenceIndicator value={d.confidence} /></div>}
                </div>
              )}

              <Field icon={Database} label="Data source">{d.source}</Field>
              <Field icon={FileText} label="Records used">{d.records}</Field>
              <Field icon={Calculator} label="Formula">{d.formula ? <code className="rounded bg-bg-subtle px-1.5 py-0.5 text-[13px]">{d.formula}</code> : null}</Field>
              <Field icon={Calendar} label="Date range">{d.dateRange}</Field>
              <Field icon={Activity} label="Calculation logic">{d.logic}</Field>
              <Field icon={Clock} label="Last refreshed">{d.lastRefresh}</Field>

              {Array.isArray(d.transactions) && d.transactions.length > 0 && (
                <div className="py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Contributing transactions</p>
                  <ul className="space-y-1.5">
                    {d.transactions.slice(0, 8).map((t, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-ink">{t.label || t.name || t.description || `Item ${i + 1}`}</span>
                        {t.amount != null && <span className="figure ml-3 shrink-0 font-semibold text-ink">{t.amount}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!d.source && !d.records && !d.formula && !d.dateRange && !d.logic && !d.lastRefresh && (
                <p className="py-6 text-center text-sm text-ink-muted">Detailed breakdown isn&rsquo;t available for this metric yet. We show whatever metadata the source provides.</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default DrillDownDrawer;
