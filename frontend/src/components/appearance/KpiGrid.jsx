import { useEffect, useState } from "react";
import ChartService from "../../services/chartService";
import { formatCurrency } from "../../utils/formatters";

// Builds a tiny inline SVG sparkline from a numeric series. Pure SVG, no deps.
function Sparkline({ points = [], color = "rgb(var(--c-primary))", w = 96, h = 28 }) {
  if (!points || points.length < 2) return <div style={{ height: h }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / span) * (h - 4) - 2]);
  const d = coords.map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  const id = `spk-${color.replace(/[^a-z]/gi, "")}-${Math.round(points[0])}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 240, strokeDashoffset: 0, animation: "spk-draw 900ms ease" }} />
    </svg>
  );
}

function TrendBadge({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  const up = v >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-risk-low" : "text-risk-high"}`}>
      {up ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
    </span>
  );
}

const WRAP = {
  classic: "border border-border bg-surface shadow-card",
  sparklines: "border border-border bg-surface shadow-card",
  glass: "border border-white/10 bg-white/5 backdrop-blur shadow-card",
  executive: "border-l-4 border-l-primary border border-border bg-surface shadow-card",
  command: "border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent shadow-card",
};

function Card({ item, style, spark }) {
  const wrap = WRAP[style] || WRAP.classic;
  const showSpark = (style === "sparklines" || style === "command") && spark && spark.length > 1;
  const display = item.isCurrency ? formatCurrency(item.value) : `${item.value ?? 0}${item.suffix || ""}`;
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-card p-5 ${wrap}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">{item.label}</p>
        {item.trend != null && <TrendBadge value={item.trend} />}
      </div>
      <p className={`figure whitespace-nowrap text-2xl font-bold leading-none ${item.accent || "text-ink"}`}
        style={{ fontSize: display.length > 12 ? "1.25rem" : undefined }}>
        {display}
      </p>
      {showSpark && <div className="mt-1"><Sparkline points={spark} color={item.color} /></div>}
    </div>
  );
}

function KpiGrid({ health, style = "classic" }) {
  const h = health || {};
  const [series, setSeries] = useState({ revenue: [], profit: [], expense: [] });

  useEffect(() => {
    let alive = true;
    if (style === "sparklines" || style === "command") {
      Promise.all([
        ChartService.getRevenueChart().catch(() => []),
        ChartService.getProfitChart().catch(() => []),
        ChartService.getExpenseTrendChart().catch(() => []),
      ]).then(([rev, prof, exp]) => {
        if (!alive) return;
        setSeries({
          revenue: (rev || []).map((d) => Number(d.value ?? d.revenue ?? 0)),
          profit: (prof || []).map((d) => Number(d.value ?? d.profit ?? 0)),
          expense: (exp || []).map((d) => Number(d.value ?? d.expense ?? 0)),
        });
      });
    }
    return () => { alive = false; };
  }, [style]);

  const cards = [
    { key: "revenue", label: "Revenue (30d)", value: h.revenue, trend: h.growth_rate, isCurrency: true, color: "rgb(var(--c-primary))", spark: series.revenue },
    { key: "profit", label: "Net profit (30d)", value: h.net_profit, isCurrency: true, accent: h.net_profit >= 0 ? "text-risk-low" : "text-risk-high", color: "rgb(var(--c-risk-low))", spark: series.profit },
    { key: "expenses", label: "Expenses (30d)", value: h.expenses, isCurrency: true, color: "rgb(var(--c-gold))", spark: series.expense },
    { key: "receivables", label: "Receivables", value: h.outstanding_receivables ?? 0, isCurrency: true, color: "rgb(var(--c-primary))", spark: [] },
    { key: "health", label: "Health score", value: h.health_score ?? 0, suffix: "/100", isCurrency: false, color: "rgb(var(--c-risk-low))", spark: [] },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => <Card key={c.key} item={c} style={style} spark={c.spark} />)}
    </div>
  );
}

export default KpiGrid;
