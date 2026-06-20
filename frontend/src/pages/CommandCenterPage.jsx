import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
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
import MarketRadarWidget from "../components/command/MarketRadarWidget";
import FreshnessBanner from "../components/command/FreshnessBanner";
import BusinessProfileModal from "../components/command/BusinessProfileModal";
import OnboardingCard from "../components/command/OnboardingCard";
import ProactiveBrief from "../components/command/ProactiveBrief";
import GoalsBenchmark from "../components/command/GoalsBenchmark";
import CashKpiStrip from "../components/command/CashKpiStrip";
import RevenueExpenseChart from "../components/common/charts/RevenueExpenseChart";
import ExpenseChart from "../components/common/charts/ExpenseChart";
import HealthScoreChart from "../components/common/charts/HealthScoreChart";

function CommandCenterPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

  // Refetch when the tab/window regains focus, so returning to the dashboard
  // after an import always reflects the latest alerts, KPIs, and actions
  // even though this single-page app doesn't remount the component.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [load]);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          {/* Header */}
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-4">
              <Avatar user={user} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Business Command Center</p>
                <h1 className="font-display mt-1 truncate text-2xl font-bold text-ink sm:text-3xl">
                  {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                  Everything that matters — health, what to do, what&rsquo;s risky, and why — in one place.
                </p>
              </div>
            </div>
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
              {/* AI CFO proactive brief — speaks first */}
              <ProactiveBrief />

              {/* Onboarding / data coverage */}
              <OnboardingCard coverage={data.coverage} onChanged={load} />

              <HealthHero health={data.health} />

              {/* Cash & working capital KPIs */}
              <CashKpiStrip health={data.health} />

              {/* Upload freshness banner (only shows when due/overdue) */}
              <FreshnessBanner freshness={data.freshness} />

              {/* Goals + benchmarking */}
              <GoalsBenchmark goals={data.goals} benchmark={data.benchmark} onChanged={load} />

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
                  <MarketRadarWidget data={data.market} onSetup={() => setProfileOpen(true)} onChanged={load} />
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
      <BusinessProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onSaved={load} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Avatar: uploaded picture if present, else chosen color preset, else
// colored initials. Mirrors the Settings avatar options.
const AVATAR_PRESET_COLORS = {
  indigo: "#4338ca", emerald: "#059669", amber: "#d97706",
  rose: "#e11d48", sky: "#0284c7", violet: "#7c3aed",
};

function Avatar({ user }) {
  const initials = ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")).toUpperCase() || "B";
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
      />
    );
  }
  if (user?.avatar_preset && AVATAR_PRESET_COLORS[user.avatar_preset]) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ring-2 ring-primary/20"
        style={{ backgroundColor: AVATAR_PRESET_COLORS[user.avatar_preset] }}
      >
        {initials}
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary ring-2 ring-primary/20">
      {initials}
    </div>
  );
}

export default CommandCenterPage;
