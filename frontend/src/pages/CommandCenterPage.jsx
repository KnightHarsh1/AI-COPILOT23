import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import CommandCenterService from "../services/commandCenterService";
import HealthHero from "../components/command/HealthHero";
import ActionCenter from "../components/command/ActionCenter";
import AIInsights from "../components/command/AIInsights";
import CollectionsWidget from "../components/command/CollectionsWidget";
import ProductWidget from "../components/command/ProductWidget";
import ComplianceWidget from "../components/command/ComplianceWidget";
import ComplianceSetupModal from "../components/command/ComplianceSetupModal";
import RevenueExpenseChart from "../components/common/charts/RevenueExpenseChart";
import ExpenseChart from "../components/common/charts/ExpenseChart";
import HealthScoreChart from "../components/common/charts/HealthScoreChart";

function CommandCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CommandCenterService.getCommandCenter();
      setData(result);
      setLoadError(false);
    } catch (_) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          {/* Header */}
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Business Command Center</p>
            <h1 className="font-display mt-2 text-3xl font-bold text-ink">
              {greeting()}, here&rsquo;s your business today
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Everything that matters — health, what to do, what&rsquo;s risky, and why — in one place.
            </p>
          </section>

          {loading && (
            <div className="flex items-center justify-center rounded-card border border-border bg-surface p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {loadError && !loading && (
            <section className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">
              Some data couldn&rsquo;t be loaded. Try refreshing the page.
            </section>
          )}

          {!loading && data && (
            <>
              {/* Section 1 — Business Health */}
              <HealthHero health={data.health} />

              {/* Section 2 — Daily AI Action Center */}
              <ActionCenter actionCenter={data.action_center} />

              {/* Sections 4-6 — Intelligence widgets */}
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Intelligence
                </p>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <CollectionsWidget data={data.collections} />
                  <ProductWidget data={data.product} />
                  <ComplianceWidget data={data.compliance} onSetup={() => setSetupOpen(true)} />
                </div>
              </section>

              {/* Section 3 — AI Insights */}
              <AIInsights insights={data.insights} />

              {/* Charts */}
              <div className="border-t border-border pt-2">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Trends &amp; charts
                </p>
              </div>

              <section className="rounded-card border border-border bg-surface p-6 shadow-card">
                <h2 className="font-display mb-4 text-xl font-semibold text-ink">Revenue, expenses &amp; profit</h2>
                <RevenueExpenseChart />
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-card border border-border bg-surface p-6 shadow-card">
                  <h2 className="font-display mb-4 text-xl font-semibold text-ink">Health trend</h2>
                  <HealthScoreChart />
                </div>
                <div className="rounded-card border border-border bg-surface p-6 shadow-card">
                  <h2 className="font-display mb-4 text-xl font-semibold text-ink">Expense breakdown</h2>
                  <ExpenseChart />
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <ComplianceSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} onSaved={load} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default CommandCenterPage;
