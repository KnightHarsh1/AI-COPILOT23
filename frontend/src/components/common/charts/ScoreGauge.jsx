import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "./chartTheme";

function scoreColor(score) {
  if (score >= 70) return CHART_COLORS.riskLow;
  if (score >= 45) return CHART_COLORS.gold;
  return CHART_COLORS.riskHigh;
}

function scoreLabel(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Watch";
  if (score >= 40) return "Needs work";
  return "At risk";
}

// Compact radial gauge. size controls diameter; showLabel toggles the
// word under the number.
function ScoreGauge({ score = 0, size = 160, showLabel = true, label }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(value);
  const data = [{ name: "score", value, fill: color }];

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div style={{ width: size, height: size, position: "relative" }}>
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: CHART_COLORS.border }} dataKey="value" cornerRadius={12} angleAxisId={0} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span className="figure font-display font-bold text-ink" style={{ fontSize: size * 0.3, lineHeight: 1 }}>
            {value}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="mt-1 whitespace-nowrap text-center text-xs font-semibold" style={{ color }}>
          {label || scoreLabel(value)}
        </span>
      )}
    </div>
  );
}

export default ScoreGauge;
export { scoreColor, scoreLabel };
