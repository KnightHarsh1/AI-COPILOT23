import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: CHART_COLORS.border }} tickLine={false} />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={compactCurrency} width={56} />
          <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatCurrency(value)} />
          <Legend verticalAlign="top" height={32} iconType="circle" />
          <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Expenses" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.riskLow} strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueExpenseChart;
