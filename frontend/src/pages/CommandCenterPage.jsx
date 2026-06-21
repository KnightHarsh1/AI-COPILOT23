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
import AskBox from "../components/command/AskBox";
import ScoreChangeCard from "../components/command/ScoreChangeCard";
import GoalsBenchmark from "../components/command/GoalsBenchmark";
import CashKpiStrip from "../components/command/CashKpiStrip";
import RevenueExpenseChart from "../components/common/charts/RevenueExpenseChart";
import ExpenseChart from "../components/common/charts/ExpenseChart";
import HealthScoreChart from "../components/common/charts/HealthScoreChart";

const TABS = [
  { id: "today", label: "Today" },
  { id: "intelligence", label: "Intelligence" },
  { id: "goals", label: "Goals & trends" },
];

function CommandCenterPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState("today");

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
  // after an import always reflects the latest data even in this SPA.
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

  const incomplete = data?.coverage && !data.coverage.is_complete;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="min-w-0 space-y-6">
          {/* Briefing header */}
          <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar user={user} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    {todayLabel()}
                  </p>
                  <h1 className="font-display mt-1 truncate text-2xl font-bold text-ink sm:text-3xl">
                    {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
                  </h1>
                  <p className="mt-1 text-sm text-ink-muted">Here&rsquo;s what matters in your business today.</p>
                </div>
              </div>
              {data?.health?.health_score != null && (
                <HealthBadge score={Math.round(data.health.health_score)} />
              )}
            </div>
          </section>

          {loading && (
            <div className="flex items-center justify-center rounded-card border border-border bg-surface p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {loadError && !loading && (
            <section className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">
              Some data couldn&rsquo;t be loaded. Refresh the page to try again.
            </section>
          )}

          {!loading && data && (
            <>
              {/* Setup first if data is incomplete — nothing else matters until then */}
              {incomplete && <OnboardingCard coverage={data.coverage} onChanged={load} />}

              {/* Tabs keep the page calm: one focus at a time */}
              <div className="flex gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex-1 whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition ${
                      tab === t.id ? "bg-primary text-white shadow-card" : "text-ink-muted hover:bg-bg-subtle hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "today" && (
                <div className="space-y-6">
                  {/* The advisor speaks first */}
                  <ProactiveBrief />

                  {/* The four numbers + health, full width, never truncated */}
                  <HealthHero health={data.health} />

                  {/* Cash position in plain language with verdicts */}
                  <CashKpiStrip health={data.health} />

                  {/* What changed + freshness nudge. Each may be empty; they
                      stack cleanly without leaving a lopsided grid cell. */}
                  <div className="grid gap-5 [&>*]:min-w-0 sm:grid-cols-2 [&>*:only-child]:sm:col-span-2">
                    <ScoreChangeCard />
                    <FreshnessBanner freshness={data.freshness} />
                  </div>

                  {/* Today's actions */}
                  <ActionCenter actionCenter={data.action_center} />

                  {/* Ask anything */}
                  <AskBox />
                </div>
              )}

              {tab === "intelligence" && (
                <div className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <CollectionsWidget data={data.collections} />
                    <ProductWidget data={data.product} />
                    <ComplianceWidget data={data.compliance} onSetup={() => setSetupOpen(true)} />
                    <MarketRadarWidget data={data.market} onSetup={() => setProfileOpen(true)} onChanged={load} />
                  </div>
                  <AIInsights insights={data.insights} />
                </div>
              )}

              {tab === "goals" && (
                <div className="space-y-6">
                  <GoalsBenchmark goals={data.goals} benchmark={data.benchmark} onChanged={load} />

                  <section className="overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card">
                    <h2 className="font-display mb-4 text-lg font-semibold text-ink">Revenue, expenses &amp; profit</h2>
                    <RevenueExpenseChart />
                  </section>

                  <section className="grid gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card">
                      <h2 className="font-display mb-4 text-lg font-semibold text-ink">Health trend</h2>
                      <HealthScoreChart />
                    </div>
                    <div className="overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card">
                      <h2 className="font-display mb-4 text-lg font-semibold text-ink">Expense breakdown</h2>
                      <ExpenseChart />
                    </div>
                  </section>
                </div>
              )}
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

function todayLabel() {
  try {
    return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  } catch (_) {
    return "Today";
  }
}

function HealthBadge({ score }) {
  const tones = {
    good: "text-risk-low",
    watch: "text-gold",
    bad: "text-risk-high",
  };
  const key = score >= 70 ? "good" : score >= 45 ? "watch" : "bad";
  const cls = tones[key];
  const word = score >= 85 ? "Excellent" : score >= 70 ? "Healthy" : score >= 55 ? "Watch" : score >= 40 ? "Needs work" : "At risk";
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-pill border border-border bg-bg-subtle px-4 py-2">
      <span className={`figure text-2xl font-bold leading-none ${cls}`}>{score}</span>
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Health</p>
        <p className={`text-xs font-semibold ${cls}`}>{word}</p>
      </div>
    </div>
  );
}

const AVATAR_PRESET_COLORS = {
  indigo: "#4338ca", emerald: "#059669", amber: "#d97706",
  rose: "#e11d48", sky: "#0284c7", violet: "#7c3aed",
};

function Avatar({ user }) {
  const initials = ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")).toUpperCase() || "B";
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/20" />;
  }
  if (user?.avatar_preset && AVATAR_PRESET_COLORS[user.avatar_preset]) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ring-2 ring-primary/20"
        style={{ backgroundColor: AVATAR_PRESET_COLORS[user.avatar_preset] }}>
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
