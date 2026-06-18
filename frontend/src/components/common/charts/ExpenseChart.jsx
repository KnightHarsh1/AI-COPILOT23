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

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" outerRadius={100} label={({ label }) => label}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseChart;
