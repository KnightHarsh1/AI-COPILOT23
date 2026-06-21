import RevenueExpenseChart from "../common/charts/RevenueExpenseChart";
import GradientAreaChart from "../common/charts/GradientAreaChart";
import ForecastChart from "../common/charts/ForecastChart";
import WaterfallChart from "../common/charts/WaterfallChart";

// Maps the selected `mainChart` appearance key to a chart component. Every
// chart pulls live data internally — the factory only chooses which to show.
// "classic" and "stacked" both use the existing composed revenue/expense
// chart (the app's proven default); the others are the new styles.
const TITLES = {
  classic: "Revenue, expenses & profit",
  stacked: "Revenue vs expenses",
  gradientArea: "Revenue, expenses & profit",
  executiveTrend: "Business trend",
  forecast: "Revenue forecast",
  waterfall: "Profit breakdown",
};

function ChartFactory({ variant = "classic", health, withCard = true, title }) {
  let chart;
  switch (variant) {
    case "gradientArea":
    case "executiveTrend":
      chart = <GradientAreaChart />;
      break;
    case "forecast":
      chart = <ForecastChart />;
      break;
    case "waterfall":
      chart = <WaterfallChart health={health} />;
      break;
    case "stacked":
    case "classic":
    default:
      chart = <RevenueExpenseChart />;
  }

  if (!withCard) return chart;

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display mb-4 text-lg font-semibold text-ink">{title || TITLES[variant] || "Trends"}</h2>
      {chart}
    </section>
  );
}

export default ChartFactory;
