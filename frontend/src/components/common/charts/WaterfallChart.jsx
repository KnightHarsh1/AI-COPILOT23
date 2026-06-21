import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import CommandCenterService from "../../../services/commandCenterService";
import { formatCurrency } from "../../../utils/formatters";

// Profit waterfall built from the live health KPIs. Flow:
//   Revenue → (Expenses) → Net profit
// We use the figures already computed server-side (revenue, total expenses,
// net profit). When a COGS / tax split isn't available from the data we don't
// invent it — we show the steps we can derive truthfully.
function compact(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

function WaterfallChart({ health }) {
  const [h, setH] = useState(health || null);

  useEffect(() => {
    if (!health) {
      CommandCenterService.getCommandCenter().then((d) => setH(d.health)).catch(() => {});
    } else {
      setH(health);
    }
  }, [health]);

  if (!h) return <p className="text-sm text-ink-muted">Loading…</p>;

  const revenue = Number(h.revenue) || 0;
  const expenses = Number(h.expenses) || 0;
  const grossProfit = Number(h.gross_profit);
  const netProfit = h.net_profit != null ? Number(h.net_profit) : revenue - expenses;

  if (revenue === 0 && expenses === 0) {
    return <p className="text-sm text-ink-muted">No data yet — upload sales and expense files to see your profit breakdown.</p>;
  }

  // Build steps. Each step has a running base + delta.
  const steps = [];
  steps.push({ label: "Revenue", delta: revenue, type: "total" });
  if (!Number.isNaN(grossProfit) && grossProfit > 0 && grossProfit < revenue) {
    steps.push({ label: "COGS", delta: -(revenue - grossProfit), type: "loss" });
    steps.push({ label: "Gross profit", delta: 0, type: "subtotal", value: grossProfit });
    steps.push({ label: "Operating exp.", delta: -(grossProfit - netProfit), type: "loss" });
  } else {
    steps.push({ label: "Expenses", delta: -expenses, type: "loss" });
  }
  steps.push({ label: "Net profit", delta: 0, type: netProfit >= 0 ? "total" : "lossTotal", value: netProfit });

  // Compute running positions.
  let running = 0;
  const bars = steps.map((s) => {
    if (s.type === "total" && s.label === "Revenue") {
      const bar = { ...s, from: 0, to: revenue, top: revenue };
      running = revenue;
      return bar;
    }
    if (s.type === "subtotal" || s.label === "Net profit") {
      const top = s.value;
      const bar = { ...s, from: 0, to: top, top };
      running = top;
      return bar;
    }
    const next = running + s.delta;
    const bar = { ...s, from: Math.min(running, next), to: Math.max(running, next), top: Math.max(running, next) };
    running = next;
    return bar;
  });

  const maxV = Math.max(...bars.map((b) => b.top), revenue) * 1.1 || 1;
  const H = 280, padB = 40, padT = 10, plotH = H - padB - padT;
  const colW = 100 / bars.length;
  const y = (v) => padT + plotH * (1 - v / maxV);

  const colorFor = (t) =>
    t === "total" ? "rgb(var(--c-primary))"
    : t === "subtotal" ? "rgb(var(--c-gold))"
    : t === "lossTotal" ? "rgb(var(--c-risk-high))"
    : t === "loss" ? "rgb(var(--c-risk-high))"
    : "rgb(var(--c-risk-low))";

  return (
    <div>
      <svg width="100%" viewBox={`0 0 760 ${H}`} preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const yy = padT + plotH * f;
          return <line key={f} x1="50" y1={yy} x2="760" y2={yy} stroke="rgb(var(--c-border))" strokeDasharray="3 3" />;
        })}
        {bars.map((b, i) => {
          const cx = 50 + (760 - 50) * (i * colW + colW / 2) / 100;
          const bw = ((760 - 50) * colW / 100) * 0.55;
          const yTop = y(b.to);
          const barH = Math.max(y(b.from) - y(b.to), 2);
          return (
            <g key={b.label}>
              <rect x={cx - bw / 2} y={yTop} width={bw} height={barH} rx="4" fill={colorFor(b.type)} />
              <text x={cx} y={yTop - 6} textAnchor="middle" className="figure" fill="rgb(var(--c-ink))" fontSize="12" fontWeight="600">
                {compact(b.value != null ? b.value : Math.abs(b.delta) || b.top)}
              </text>
              <text x={cx} y={H - 16} textAnchor="middle" fill="rgb(var(--c-ink-muted))" fontSize="11">{b.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Inflow</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-risk-high" />Outflow</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-risk-low" />Net</span>
      </div>
    </div>
  );
}

export default WaterfallChart;
