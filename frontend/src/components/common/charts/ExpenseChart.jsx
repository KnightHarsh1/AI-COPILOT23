import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PIE_PALETTE, tooltipContentStyle } from "./chartTheme";
import { formatCurrency } from "../../../utils/formatters";

function ExpenseChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChartService.getExpenseChart()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return <p className="text-sm text-ink-muted">No expense data yet — upload an expense file to see this breakdown.</p>;
  }

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value, name) => [
              `${formatCurrency(value)} (${total ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseChart;
