import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_COLORS, axisTickStyle, tooltipContentStyle } from "./chartTheme";

function HealthScoreChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChartService.getHealthChart()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return <p className="text-sm text-ink-muted">No trend data yet — upload your business data to see this chart.</p>;
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: CHART_COLORS.border }} tickLine={false} />
          <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipContentStyle} />
          <Line type="monotone" dataKey="value" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default HealthScoreChart;
