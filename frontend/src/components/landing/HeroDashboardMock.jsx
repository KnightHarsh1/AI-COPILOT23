import { motion, useReducedMotion } from "framer-motion";
import { Wallet, Users, ShieldCheck, TrendingUp } from "lucide-react";
import { HealthRing, KpiTile, FloatingKpi, AiBriefCard } from "./DashboardPreview";

// HeroDashboardMock — the centrepiece "product window" in the hero. Composes the
// preview primitives into a realistic Business Copilot command-center frame
// (window chrome, health ring, KPI tiles, AI brief) with floating accent cards.
// Tilts subtly in 3D for depth; flat under reduced motion.
function HeroDashboardMock() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* Floating accent cards */}
      <FloatingKpi icon={Wallet} value="₹12.4L" label="Cash position" tone="primary" className="-left-6 top-8 hidden sm:flex" delay={0.3} />
      <FloatingKpi icon={ShieldCheck} value="0 overdue" label="Compliance" tone="low" className="-right-4 top-24 hidden sm:flex" delay={0.6} />
      <FloatingKpi icon={Users} value="3 at risk" label="Customers" tone="gold" className="-left-8 bottom-16 hidden md:flex" delay={0.9} />

      <motion.div
        className="relative overflow-hidden rounded-[24px] border border-border bg-surface shadow-[0_30px_80px_-20px_rgb(var(--c-primary)/0.35)]"
        initial={{ opacity: 0, y: 40, rotateX: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-bg-subtle/60 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-risk-high/60" />
          <span className="h-3 w-3 rounded-full bg-gold/60" />
          <span className="h-3 w-3 rounded-full bg-risk-low/60" />
          <span className="ml-3 rounded-md bg-surface px-3 py-1 text-[11px] text-ink-muted">app.businesscopilot.ai/dashboard</span>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Business Health</p>
              <p className="font-display text-lg font-bold text-ink">Strong & improving</p>
            </div>
            <HealthRing score={86} size={96} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <KpiTile icon={TrendingUp} label="Revenue (MTD)" value="₹8.6L" delta="18%" positive spark={[6, 9, 7, 11, 10, 14, 13, 17]} />
            <KpiTile icon={Wallet} label="Net profit" value="₹2.1L" delta="12%" positive spark={[4, 5, 6, 5, 7, 8, 9, 11]} />
          </div>

          <div className="mt-3">
            <AiBriefCard />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default HeroDashboardMock;
