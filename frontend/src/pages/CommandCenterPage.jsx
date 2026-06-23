import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { SECTION_ICONS } from "../components/common/navIcons";
import { useAuth } from "../context/AuthContext";
import { useAppearance } from "../context/AppearanceContext";
import { resolveAppearance } from "../components/appearance/resolveAppearance";
import HealthScore from "../components/appearance/HealthScore";
import KpiGrid from "../components/appearance/KpiGrid";
import ChartFactory from "../components/appearance/ChartFactory";
import InsightsPanel from "../components/appearance/InsightsPanel";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import CommandCenterService from "../services/commandCenterService";
import HealthHero from "../components/command/HealthHero";
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
import CustomerIntelligenceCard from "../components/command/CustomerIntelligenceCard";
import OpportunityCard from "../components/command/OpportunityCard";
import GstCard from "../components/command/GstCard";
import CeoBriefing from "../components/command/CeoBriefing";
import RisksOpportunities from "../components/command/RisksOpportunities";
import HealthScoreExplainer from "../components/command/HealthScoreExplainer";
import MoneySummaryBar from "../components/command/MoneySummaryBar";
import DailyActionsPanel from "../components/command/DailyActionsPanel";
import SetupPill from "../components/common/SetupPill";
import IntelligenceHub from "../components/command/IntelligenceHub";
import DashboardSkeleton from "../components/common/DashboardSkeleton";
import InsightTimeline from "../components/command/InsightTimeline";
import GrowthService from "../services/growthService";
import ExpenseChart from "../components/common/charts/ExpenseChart";
import HealthScoreChart from "../components/common/charts/HealthScoreChart";

const TABS = [
  { id: "today", label: "Today" },
  { id: "risks", label: "Risks & opportunities" },
  { id: "actions", label: "Daily actions" },
  { id: "intelligence", label: "Intelligence" },
  { id: "goals", label: "Goals & trends" },
];

function CommandCenterPage() {
  const { user } = useAuth();
  const { appearance } = useAppearance();
  const ui = resolveAppearance(appearance);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState(() => {
    if (typeof window === "undefined") return "today";
    const p = new URLSearchParams(window.location.search).get("tab");
    return ["today", "risks", "actions", "intelligence", "goals"].includes(p) ? p : "today";
  });
  const [scoreChange, setScoreChange] = useState(null);
  const [actionLevel, setActionLevel] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("level") || "all";
  });
  const [intelCategory, setIntelCategory] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("intel");
  });
  const [reopenedOnboarding, setReopenedOnboarding] = useState(false);

  const dismissOnboarding = useCallback(() => {
    setReopenedOnboarding(false);
  }, []);

  const reopenOnboarding = useCallback(() => {
    setReopenedOnboarding(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // From the Attention Meter's View buttons: jump to Daily Actions filtered.
  const viewAttentionLevel = useCallback((level) => {
    setActionLevel(level);
    setTab("actions");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
    // Score change powers the CEO briefing's "improved from X to Y" line.
    GrowthService.getScoreChange().then(setScoreChange).catch(() => setScoreChange(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // React to sidebar submenu navigation (?tab= / ?level=) while already on the page.
  const _loc = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(_loc.search);
    const t = params.get("tab");
    const lvl = params.get("level");
    if (t && ["today", "risks", "actions", "intelligence", "goals"].includes(t)) setTab(t);
    if (lvl) setActionLevel(lvl);
    const intel = params.get("intel");
    if (intel) { setIntelCategory(intel); setTab("intelligence"); }
  }, [_loc.search]);

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
          {/* Lightweight greeting shown only while data loads; once loaded,
              the full CEO Briefing below replaces it. */}
          {(loading || loadError) && (
            <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
              <div className="flex items-center gap-4 p-6">
                <Avatar user={user} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{todayLabel()}</p>
                  <h1 className="font-display mt-1 truncate text-2xl font-bold text-ink sm:text-3xl">
                    {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
                  </h1>
                </div>
              </div>
            </section>
          )}

          {loading && <DashboardSkeleton />}

          {loadError && !loading && (
            <section className="rounded-card border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">
              Some data couldn&rsquo;t be loaded. Refresh the page to try again.
            </section>
          )}

          {!loading && data && (
            <>
              {/* Compact setup pill at the very top — no large onboarding
                  banner occupies the dashboard body. Reopenable any time. */}
              {incomplete && (
                <div className="flex items-center justify-between">
                  <SetupPill coverage={data.coverage} onContinue={reopenOnboarding} />
                </div>
              )}

              {/* Onboarding card only shows when the user explicitly reopens it
                  via the pill. By default it stays out of the body. */}
              {incomplete && reopenedOnboarding && (
                <OnboardingCard coverage={data.coverage} onChanged={load} onDismiss={dismissOnboarding} />
              )}

              {/* 1. GREETING HERO — executive hero section, above the tabs */}
              <CeoBriefing data={data} user={user} scoreChange={scoreChange} />

              {/* 2. TAB NAVIGATION — directly below the greeting */}
              <div id="dashboard-tabs" className="glass-card flex gap-1 overflow-x-auto rounded-pill p-1.5">
                {TABS.map((t) => {
                  const Icon = SECTION_ICONS[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                        tab === t.id
                          ? "bg-gradient-to-r from-primary to-primary-hover text-white tab-active-glow"
                          : "text-ink-muted hover:bg-white/5 hover:text-ink"
                      }`}
                    >
                      {Icon && <Icon size={15} strokeWidth={2} />}
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {tab === "today" && (() => {
                // Build the widget map; render in the user's saved order,
                // skipping any they've hidden. Each is a presentation block over
                // the same data — no logic changes.
                const widgetMap = {
                  kpis: ui.kpiStyle === "classic"
                    ? <HealthHero health={data.health} healthStyle={appearance.healthStyle} />
                    : <KpiGrid health={data.health} style={ui.kpiStyle} />,
                  money: <MoneySummaryBar actionCenter={data.action_center} collections={data.collections} opportunities={data.opportunities} />,
                  health: <HealthScoreExplainer health={data.health} scoreChange={scoreChange} healthStyle={appearance.healthStyle} />,
                  cash: <CashKpiStrip health={data.health} />,
                  changes: (
                    <div className="grid gap-5 [&>*]:min-w-0 sm:grid-cols-2 [&>*:only-child]:sm:col-span-2">
                      <ScoreChangeCard />
                      <FreshnessBanner freshness={data.freshness} />
                    </div>
                  ),
                  aicfo: <><ProactiveBrief /><div className="mt-6"><AskBox /></div></>,
                };
                const hidden = new Set(appearance.hiddenWidgets || []);
                const order = (appearance.widgetOrder || Object.keys(widgetMap)).filter((id) => widgetMap[id] && !hidden.has(id));
                return (
                  <div id="today-section" className="space-y-6">
                    {order.map((id, i) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {widgetMap[id]}
                      </motion.div>
                    ))}
                    {order.length === 0 && (
                      <div className="rounded-card border border-border bg-surface p-10 text-center">
                        <p className="font-display text-lg font-semibold text-ink">All widgets are hidden</p>
                        <p className="mt-1 text-sm text-ink-muted">Re-enable widgets from Settings → Appearance → Dashboard widgets.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {tab === "risks" && (
                <RisksOpportunities actionCenter={data.action_center} />
              )}

              {tab === "actions" && (
                <DailyActionsPanel actionCenter={data.action_center} initialLevel={actionLevel} />
              )}

              {tab === "intelligence" && (
                <IntelligenceHub
                  data={data}
                  insightsStyle={ui.insightsStyle}
                  initialCategory={intelCategory}
                  onSetup={() => setSetupOpen(true)}
                  onProfile={() => setProfileOpen(true)}
                  onReload={load}
                />
              )}

              {tab === "goals" && (
                <div className="space-y-6">
                  <InsightTimeline actionCenter={data.action_center} />

                  <GoalsBenchmark goals={data.goals} benchmark={data.benchmark} onChanged={load} />

                  <ChartFactory variant={ui.mainChart} health={data.health} />

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
