import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, axisTickStyle, tooltipContentStyle } from "./chartTheme";
import { formatCurrency } from "../../../utils/formatters";

function compactCurrency(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const SERIES = [
  { key: "revenue", label: "Revenue", color: CHART_COLORS.primary },
  { key: "expense", label: "Expenses", color: CHART_COLORS.gold },
  { key: "profit", label: "Profit", color: CHART_COLORS.riskLow },
];

function LegendChips() {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {SERIES.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-card-hover">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="space-y-1">
        {SERIES.map((s) => {
          const item = payload.find((p) => p.dataKey === s.key);
          if (!item) return null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-6 text-sm">
              <span className="inline-flex items-center gap-2 text-ink-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="figure font-semibold text-ink">{formatCurrency(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueExpenseChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChartService.getRevenueVsExpenseChart()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No data yet — upload sales and expense files to see revenue, expenses, and profit together.
      </p>
    );
  }

  return (
    <div>
      <LegendChips />
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 0 }} barGap={6}>
            <defs>
              <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.95} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.95} />
                <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.riskLow} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.riskLow} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTickStyle}
              axisLine={{ stroke: CHART_COLORS.border }}
              tickLine={false}
              padding={{ left: 16, right: 16 }}
            />
            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={compactCurrency} width={56} />
            <ReferenceLine y={0} stroke={CHART_COLORS.inkMuted} strokeOpacity={0.4} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.border, fillOpacity: 0.25 }} />
            <Bar dataKey="revenue" name="Revenue" fill="url(#grad-revenue)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            <Bar dataKey="expense" name="Expenses" fill="url(#grad-expense)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            <Area
              type="monotone"
              dataKey="profit"
              name="Profit"
              stroke={CHART_COLORS.riskLow}
              strokeWidth={3}
              fill="url(#grad-profit)"
              dot={{ r: 3, fill: CHART_COLORS.riskLow, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RevenueExpenseChart;
