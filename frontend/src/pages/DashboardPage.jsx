import { useEffect, useState } from 'react';
import RecommendationsList from '../components/common/recommendations/RecommendationsList';
import AlertsList from '../components/common/alerts/AlertsList';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import DashboardCard from '../components/common/DashboardCard';
import AIBusinessBrief from '../components/common/AIBusinessBrief';
import KPIService from '../services/kpiService';
import DashboardService from '../services/dashboardService';
import HealthScoreChart from '../components/common/charts/HealthScoreChart';
import RevenueChart from '../components/common/charts/RevenueChart';
import ProfitChart from '../components/common/charts/ProfitChart';
import ExpenseChart from '../components/common/charts/ExpenseChart';
import { formatCurrency } from '../utils/formatters';

function healthDescriptor(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Healthy';
  if (score >= 55) return 'Needs attention';
  return 'At risk';
}

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.all([DashboardService.getSummary(), KPIService.calculateKPIs()])
      .then(([summaryData, kpiData]) => {
        if (isMounted) {
          setSummary(summaryData);
          setKpis(kpiData);
        }
      })
      .catch(() => {
        if (isMounted) setLoadError(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summaryCards = [
    {
      title: 'Business Health Score',
      value: summary ? `${Math.round(summary.health_score)} / 100` : '—',
      caption: summary ? healthDescriptor(summary.health_score) : 'Loading…',
    },
    {
      title: 'Revenue (30d)',
      value: summary ? formatCurrency(summary.revenue) : '—',
      caption: 'Trailing 30-day window',
      trend: kpis ? kpis.growth_rate : null,
    },
    {
      title: 'Net Profit (30d)',
      value: summary ? formatCurrency(summary.net_profit) : '—',
      caption: kpis ? `${kpis.profit_margin.toFixed(1)}% margin` : 'Loading…',
    },
    {
      title: 'Expenses (30d)',
      value: summary ? formatCurrency(summary.expenses) : '—',
      caption: 'All recorded expenses',
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h1 className="font-display text-3xl font-bold text-ink">Your AI CFO</h1>
            <p className="mt-2 text-ink-muted">
              Upload your business data and Business Copilot tells you what to do next.
            </p>
          </section>

          {loadError && (
            <section className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">
              Some dashboard data couldn&rsquo;t be loaded. Try refreshing the page.
            </section>
          )}

          <AIBusinessBrief />

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <DashboardCard
                key={card.title}
                title={card.title}
                value={card.value}
                caption={card.caption}
                trend={card.trend}
              />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-card border border-border bg-surface p-6 shadow-card">
              <h2 className="font-display mb-4 text-xl font-semibold text-ink">Business Alerts</h2>
              <AlertsList />
            </div>
            <div className="rounded-card border border-border bg-surface p-6 shadow-card">
              <h2 className="font-display mb-4 text-xl font-semibold text-ink">Recommendations</h2>
              <RecommendationsList />
            </div>
          </section>

          <div className="border-t border-border pt-2">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Trends &amp; charts</p>
          </div>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="font-display mb-4 text-xl font-semibold text-ink">Business Health Trend</h2>
            <HealthScoreChart />
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-card border border-border bg-surface p-6 shadow-card">
              <h2 className="font-display mb-4 text-xl font-semibold text-ink">Revenue Trend</h2>
              <RevenueChart />
            </div>

            <div className="rounded-card border border-border bg-surface p-6 shadow-card">
              <h2 className="font-display mb-4 text-xl font-semibold text-ink">Profit Trend</h2>
              <ProfitChart />
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="font-display mb-4 text-xl font-semibold text-ink">Expense Breakdown</h2>
            <ExpenseChart />
          </section>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
