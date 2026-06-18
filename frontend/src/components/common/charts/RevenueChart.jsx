import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { CHART_COLORS, axisTickStyle, tooltipContentStyle } from "./chartTheme";
import { formatCurrency } from "../../../utils/formatters";

function RevenueChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChartService.getRevenueChart()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return <p className="text-sm text-ink-muted">No revenue data yet — upload a sales file to see this trend.</p>;
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: CHART_COLORS.border }} tickLine={false} />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueChart;
