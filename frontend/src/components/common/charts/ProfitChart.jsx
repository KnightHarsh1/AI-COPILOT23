import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { CHART_COLORS, axisTickStyle, tooltipContentStyle } from "./chartTheme";
import { formatCurrency } from "../../../utils/formatters";

function ProfitChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChartService.getProfitChart()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return <p className="text-sm text-ink-muted">No profit data yet — upload sales and expenses to see this trend.</p>;
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: CHART_COLORS.border }} tickLine={false} />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatCurrency(value)} />
          <Line type="monotone" dataKey="value" stroke={CHART_COLORS.riskLow} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ProfitChart;
