import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X, Database, Calculator, Calendar, Clock, FileText, TrendingUp } from "lucide-react";
import ConfidenceIndicator from "./ConfidenceIndicator";
import DrillDownDrawer from "./DrillDownDrawer";

// ExplainTooltip — the "explain this number" entry point. The explanation is
// rendered in a PORTAL (document.body), never inside the card, so it can never
// be clipped by overflow/scroll. Desktop: a floating glass popover positioned
// beside the trigger with auto-flip (right → left, and top if it would overflow
// the viewport). Mobile (≤640px): a bottom sheet. Click the affordance to open
// the full DrillDownDrawer for the deepest detail.

function isMobile() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
}

function Section({ icon: Icon, label, children }) {
  if (children == null || children === "") return null;
  return (
    <div className="border-t border-border py-2.5 first:border-0 first:pt-0">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
        {Icon && <Icon size={12} className="text-primary" />} {label}
      </p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

// The floating panel content — shared by popover + bottom sheet.
function ExplainPanel({ title, hint, detail, onClose, onMore }) {
  const d = detail || {};
  return (
    <div className="glass-card relative w-[300px] max-w-[92vw] rounded-2xl p-4 shadow-2xl">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 text-ink-muted transition hover:text-ink">
        <X size={15} />
      </button>
      <p className="pr-6 font-display text-base font-bold text-ink">{title || "About this number"}</p>
      {(hint || d.what) && <p className="mt-1 text-sm leading-snug text-ink-muted">{d.what || hint}</p>}
      {d.value != null && (
        <p className="figure mt-2 text-xl font-bold text-ink" title={String(d.value)}>{d.value}</p>
      )}

      <div className="mt-3">
        <Section icon={TrendingUp} label="Why it matters">{d.why}</Section>
        <Section icon={Database} label="Data sources">
          {Array.isArray(d.sources) ? (
            <ul className="space-y-0.5">{d.sources.map((s, i) => <li key={i} className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-primary" />{s}</li>)}</ul>
          ) : (d.source || null)}
        </Section>
        <Section icon={Calculator} label="Formula">{d.formula ? <code className="rounded bg-bg-subtle px-1.5 py-0.5 text-[13px]">{d.formula}</code> : null}</Section>
        <Section icon={FileText} label="Records used">{d.records}</Section>
        <Section icon={Calendar} label="Date range">{d.dateRange}</Section>
        <Section icon={Clock} label="Last updated">{d.lastRefresh}</Section>
        <Section icon={TrendingUp} label="Why it changed">{d.whyChanged}</Section>
        {d.confidence != null && (
          <div className="border-t border-border py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Confidence</p>
            <div className="mt-1"><ConfidenceIndicator value={d.confidence} size="lg" /></div>
          </div>
        )}
      </div>

      {onMore && (
        <button type="button" onClick={onMore} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-pill border border-border bg-surface py-2 text-sm font-semibold text-primary transition hover:border-primary/40">
          View source data →
        </button>
      )}
    </div>
  );
}

export function ExplainTooltip({ title, hint, detail, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: "right" });
  const [mobile, setMobile] = useState(false);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pw = 300, ph = 360, gap = 10;
    let placement = "right";
    let left = r.right + gap;
    let top = r.top + r.height / 2 - ph / 2;
    // Flip left if not enough room on the right.
    if (left + pw > window.innerWidth - 8) { placement = "left"; left = r.left - pw - gap; }
    // If still off-screen (narrow), center under the trigger.
    if (left < 8) { left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left)); top = r.bottom + gap; placement = "bottom"; }
    // Clamp vertically.
    top = Math.max(8, Math.min(window.innerHeight - ph - 8, top));
    setCoords({ top, left, placement });
  }, []);

  const doOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const m = isMobile();
    setMobile(m);
    if (!m) computePosition();
    setOpen(true);
  };
  const doClose = () => { setOpen(false); };
  const delayedClose = () => { closeTimer.current = setTimeout(() => setOpen(false), 120); };

  useEffect(() => {
    if (!open || mobile) return undefined;
    const onScrollResize = () => computePosition();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mobile, computePosition]);

  const openMore = () => { setOpen(false); setDrawer(true); };

  return (
    <span className={`group/explain relative inline-flex items-center gap-1.5 ${className}`}>
      {children}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Explain ${title || "this number"}`}
        onMouseEnter={() => { if (!isMobile()) doOpen(); }}
        onMouseLeave={() => { if (!isMobile()) delayedClose(); }}
        onClick={(e) => { e.stopPropagation(); open ? doClose() : doOpen(); }}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted opacity-60 transition hover:border-primary hover:text-primary group-hover/explain:opacity-100"
      >
        <Info size={11} />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && !mobile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }}
              onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
              onMouseLeave={delayedClose}
            >
              <ExplainPanel title={title} hint={hint} detail={detail} onClose={doClose} onMore={openMore} />
            </motion.div>
          )}

          {open && mobile && (
            <>
              <motion.div
                className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={doClose}
              />
              <motion.div
                className="fixed inset-x-0 bottom-0 z-[9999] p-3"
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
              >
                <div className="mx-auto w-full max-w-md">
                  <ExplainPanel title={title} hint={hint} detail={detail} onClose={doClose} onMore={openMore} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      <DrillDownDrawer open={drawer} onClose={() => setDrawer(false)} title={title} detail={detail} />
    </span>
  );
}

// Lightweight click popover kept for sections that import it — now also renders
// the floating ExplainPanel via the same component for consistency.
export function MetricBreakdownPopover({ title, detail, children }) {
  return (
    <ExplainTooltip title={title} detail={detail}>
      {children}
    </ExplainTooltip>
  );
}

export default ExplainTooltip;
