import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import ConfidenceIndicator from "./ConfidenceIndicator";
import DrillDownDrawer from "./DrillDownDrawer";

// ExplainTooltip — wraps any element. On hover it shows a small dark tooltip
// with a one-line explanation; clicking the info affordance opens the full
// DrillDownDrawer. This is the everyday "explain this number" entry point used
// on KPI cards, charts, alerts, recommendations, and insights.
//
// Usage:
//   <ExplainTooltip title="Revenue (30d)" hint="Sum of paid invoices" detail={{...}}>
//     <span>...the number...</span>
//   </ExplainTooltip>
export function ExplainTooltip({ title, hint, detail, children, className = "" }) {
  const [hover, setHover] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <span className={`group/explain relative inline-flex items-center gap-1.5 ${className}`}>
      {children}
      <button
        type="button"
        aria-label={`Explain ${title || "this number"}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); setDrawer(true); }}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted opacity-0 transition hover:border-primary hover:text-primary group-hover/explain:opacity-100"
      >
        <Info size={11} />
      </button>

      <AnimatePresence>
        {hover && (hint || title) && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 w-52 -translate-x-1/2 rounded-xl border border-border bg-[#0b1020] p-2.5 text-left shadow-xl"
          >
            {title && <span className="block text-xs font-bold text-white">{title}</span>}
            {hint && <span className="mt-0.5 block text-[11px] leading-snug text-slate-300">{hint}</span>}
            {detail?.confidence != null && <span className="mt-1.5 block"><ConfidenceIndicator value={detail.confidence} /></span>}
            <span className="mt-1 block text-[10px] font-medium text-primary">Click for full breakdown →</span>
          </motion.span>
        )}
      </AnimatePresence>

      <DrillDownDrawer open={drawer} onClose={() => setDrawer(false)} title={title} detail={detail} />
    </span>
  );
}

// MetricBreakdownPopover — a click-to-open inline popover (lighter than the full
// drawer) summarising source + formula + confidence. Good for charts/sections
// where a side drawer is too heavy.
export function MetricBreakdownPopover({ title, detail, children }) {
  const [open, setOpen] = useState(false);
  const d = detail || {};
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-ink-muted transition hover:text-primary">
        {children || <Info size={14} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-border bg-surface p-3 text-left shadow-xl"
          >
            <span className="block text-xs font-bold text-ink">{title || "How this is calculated"}</span>
            {d.source && <span className="mt-1.5 block text-xs"><span className="text-ink-muted">Source: </span><span className="font-semibold text-ink">{d.source}</span></span>}
            {d.formula && <span className="mt-1 block text-xs"><span className="text-ink-muted">Formula: </span><code className="rounded bg-bg-subtle px-1 py-0.5 text-[11px] text-ink">{d.formula}</code></span>}
            {d.dateRange && <span className="mt-1 block text-xs"><span className="text-ink-muted">Range: </span><span className="text-ink">{d.dateRange}</span></span>}
            {d.confidence != null && <span className="mt-2 block"><ConfidenceIndicator value={d.confidence} /></span>}
            {!d.source && !d.formula && !d.dateRange && <span className="mt-1 block text-[11px] text-ink-muted">Only limited metadata is available for this metric.</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export default ExplainTooltip;
