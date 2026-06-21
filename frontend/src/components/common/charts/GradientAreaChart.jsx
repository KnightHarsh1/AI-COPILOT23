import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_COLORS, axisTickStyle } from "./chartTheme";
import { formatCurrency } from "../../../utils/formatters";

function compact(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
}

const SERIES = [
  { key: "revenue", label: "Revenue", color: CHART_COLORS.primary },
  { key: "expense", label: "Expenses", color: CHART_COLORS.gold },
  { key: "profit", label: "Profit", color: CHART_COLORS.riskLow },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-card-hover">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {SERIES.map((s) => {
        const item = payload.find((p) => p.dataKey === s.key);
        if (!item) return null;
        return (
          <div key={s.key} className="flex items-center justify-between gap-6 text-sm">
            <span className="inline-flex items-center gap-2 text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.label}
            </span>
            <span className="figure font-semibold text-ink">{formatCurrency(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function GradientAreaChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    ChartService.getRevenueVsExpenseChart().then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return <p className="text-sm text-ink-muted">No data yet — upload sales and expense files to see trends.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}
          </span>
        ))}
      </div>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`ga-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={{ stroke: CHART_COLORS.border }} padding={{ left: 12, right: 12 }} />
            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={compact} width={56} />
            <Tooltip content={<CustomTooltip />} />
            {SERIES.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.5}
                fill={`url(#ga-${s.key})`} dot={false} activeDot={{ r: 4 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default GradientAreaChart;
