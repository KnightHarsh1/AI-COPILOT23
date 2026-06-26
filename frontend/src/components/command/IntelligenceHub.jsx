import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INTEL_ICONS } from "../common/navIcons";
import CustomerIntelligenceCard from "./CustomerIntelligenceCard";
import OpportunityCard from "./OpportunityCard";
import GstCard from "./GstCard";
import CollectionsWidget from "./CollectionsWidget";
import ProductWidget from "./ProductWidget";
import ComplianceWidget from "./ComplianceWidget";
import MarketRadarWidget from "./MarketRadarWidget";
import BalanceSheetCard from "./BalanceSheetCard";
import CashFlowCard from "./CashFlowCard";
import ProfitabilityCard from "./ProfitabilityCard";
import BankingLiquidityCard from "./BankingLiquidityCard";
import ModuleIntelligenceCard from "./ModuleIntelligenceCard";
import CommandCenterService from "../../services/commandCenterService";
import { Scale, LineChart, ShieldAlert, Crown } from "lucide-react";
import InsightsPanel from "../appearance/InsightsPanel";

// Intelligence Hub — a two-level navigation that eliminates the long scroll.
// Level 1: category tabs (only one module visible at a time). Level 2: each
// module renders its existing card/widget unchanged. No pagination, no removed
// intelligence — just focused navigation over the same data and components.

const CATEGORIES = [
  { id: "customer", label: "Customer Intelligence", short: "Customer" },
  { id: "cashflow", label: "Cash Flow Intelligence", short: "Cash Flow" },
  { id: "liquidity", label: "Banking & Liquidity", short: "Liquidity" },
  { id: "financial", label: "Financial Position", short: "Financial" },
  { id: "collections", label: "Collections Intelligence", short: "Collections" },
  { id: "product", label: "Inventory Intelligence", short: "Inventory" },
  { id: "profit", label: "Profit Intelligence", short: "Profit" },
  { id: "compliance", label: "Compliance Intelligence", short: "Compliance" },
  { id: "gst", label: "GST Intelligence", short: "GST" },
  { id: "opportunity", label: "Opportunity Intelligence", short: "Opportunity" },
  { id: "market", label: "Market Radar", short: "Market" },
  { id: "workingcapital", label: "Working Capital Intelligence", short: "Working Capital" },
  { id: "forecasting", label: "Forecasting Intelligence", short: "Forecasting" },
  { id: "risk", label: "Risk Intelligence", short: "Risk" },
  { id: "executive", label: "Executive Intelligence", short: "Executive" },
];

function EmptyModule({ label }) {
  return (
    <div className="rounded-card border border-border bg-surface p-10 text-center shadow-card">
      <p className="font-display text-lg font-semibold text-ink">No {label.toLowerCase()} data yet</p>
      <p className="mt-1 text-sm text-ink-muted">Upload the relevant file from the Data Center to unlock this intelligence.</p>
    </div>
  );
}

function IntelligenceHub({ data, onSetup, onProfile, onReload, insightsStyle, initialCategory }) {
  const VALID = ["customer", "cashflow", "liquidity", "financial", "collections", "product", "profit", "compliance", "gst", "opportunity", "market", "workingcapital", "forecasting", "risk", "executive"];
  const [cat, setCat] = useState(VALID.includes(initialCategory) ? initialCategory : "customer");
  useEffect(() => {
    if (VALID.includes(initialCategory)) setCat(initialCategory);
  }, [initialCategory]);

  // Which categories actually have data, for subtle availability dots.
  const has = {
    customer: !!(data.customers && data.customers.available),
    cashflow: !!(data.cash_flow && data.cash_flow.available),
    liquidity: !!((data.collections && data.collections.available) || (data.cash_flow && data.cash_flow.available)),
    collections: !!(data.collections && data.collections.available),
    product: !!(data.product && data.product.available),
    profit: !!(data.profitability && data.profitability.available),
    financial: !!(data.balance_sheet && data.balance_sheet.available),
    compliance: !!(data.compliance && data.compliance.available),
    gst: !!(data.gst && data.gst.available),
    opportunity: !!(data.opportunities && data.opportunities.available),
    market: !!(data.market && data.market.available),
    workingcapital: true,
    forecasting: true,
    risk: true,
    executive: true,
  };

  // Count alerts per module from the action center so each card can show a live
  // alert badge. Maps action categories → intelligence module ids.
  const CAT_TO_MODULE = {
    collections: "collections", customer_risk: "customer", liquidity_risk: "cashflow",
    cash_flow_risk: "cashflow", working_capital: "financial", debt_risk: "financial",
    liquidity_risk: "liquidity",
    profitability: "profit", inventory_risk: "product", compliance: "compliance",
    gst: "gst", reconciliation: "cashflow", opportunity: "opportunity",
    market_risk: "market", market_opportunity: "market",
  };
  const moduleAlerts = {};
  const _ac = data.action_center || {};
  [...(_ac.today || []), ...(_ac.week || []), ...(_ac.month || [])].forEach((a) => {
    const m = CAT_TO_MODULE[a.category];
    if (m && a.priority !== "low") moduleAlerts[m] = (moduleAlerts[m] || 0) + 1;
  });

  const render = () => {
    switch (cat) {
      case "customer":
        return has.customer ? <CustomerIntelligenceCard customers={data.customers} healthImpact={data.health?.health_impact?.customer} /> : <EmptyModule label="Customer" />;
      case "cashflow":
        return has.cashflow ? <CashFlowCard cashFlow={data.cash_flow} /> : <EmptyModule label="Cash flow" />;
      case "liquidity":
        return <BankingLiquidityCard />;
      case "financial":
        return has.financial ? <BalanceSheetCard balanceSheet={data.balance_sheet} /> : <EmptyModule label="Financial position" />;
      case "collections":
        return <CollectionsWidget data={data.collections} healthImpact={data.health?.health_impact?.collections} />;
      case "product":
        return <ProductWidget data={data.product} healthImpact={data.health?.health_impact?.product} />;
      case "profit":
        return has.profit ? <ProfitabilityCard profitability={data.profitability} healthImpact={data.health?.health_impact?.profit} /> : <EmptyModule label="Profitability" />;
      case "compliance":
        return <ComplianceWidget data={data.compliance} onSetup={onSetup} healthImpact={data.health?.health_impact?.compliance} />;
      case "gst":
        return has.gst ? <GstCard gst={data.gst} healthImpact={data.health?.health_impact?.gst} /> : <EmptyModule label="GST" />;
      case "opportunity":
        return has.opportunity ? <OpportunityCard opportunities={data.opportunities} /> : <EmptyModule label="Opportunity" />;
      case "market":
        return <MarketRadarWidget data={data.market} onSetup={onProfile} onChanged={onReload} />;
      case "workingcapital":
        return <ModuleIntelligenceCard fetcher={CommandCenterService.getWorkingCapital} icon={Scale} fallbackName="Working Capital Intelligence" />;
      case "forecasting":
        return <ModuleIntelligenceCard fetcher={CommandCenterService.getForecasting} icon={LineChart} fallbackName="Forecasting Intelligence" />;
      case "risk":
        return <ModuleIntelligenceCard fetcher={CommandCenterService.getRiskIntelligence} icon={ShieldAlert} fallbackName="Risk Intelligence" />;
      case "executive":
        return <ModuleIntelligenceCard fetcher={CommandCenterService.getExecutiveIntelligence} icon={Crown} fallbackName="Executive Intelligence" />;
      default:
        return null;
    }
  };

  return (
    <div id="intelligence-section" className="space-y-5">
      {/* Level 1 — large intelligence module cards (icon, name, status, alerts) */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-5">
        {CATEGORIES.map((c) => {
          const active = cat === c.id;
          const Icon = INTEL_ICONS[c.id];
          const available = has[c.id];
          const alerts = moduleAlerts[c.id] || 0;
          const status = !available ? "No data" : alerts > 0 ? `${alerts} alert${alerts > 1 ? "s" : ""}` : "Healthy";
          const statusTone = !available ? "text-ink-muted" : alerts > 0 ? "text-risk-high" : "text-risk-low";
          const dot = !available ? "bg-ink-muted" : alerts > 0 ? "bg-risk-high" : "bg-risk-low";
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative flex min-w-[180px] flex-col gap-2 overflow-hidden rounded-card border p-4 text-left transition sm:min-w-0 ${
                active
                  ? "border-primary bg-primary/5 shadow-card tab-active-glow"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-primary-hover" />}
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:scale-110"}`}>
                  {Icon && <Icon size={18} strokeWidth={2} />}
                </span>
                {alerts > 0 && available && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-risk-high px-1.5 text-[10px] font-bold text-white">{alerts}</span>
                )}
              </div>
              <p className={`text-sm font-bold leading-tight ${active ? "text-ink" : "text-ink"}`}>{c.label}</p>
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className={`text-xs font-semibold ${statusTone}`}>{status}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Level 2 — selected module (animated swap) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={cat}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {render()}
        </motion.div>
      </AnimatePresence>

      {/* AI insights apply across modules */}
      <InsightsPanel insights={data.insights} variant={insightsStyle} />
    </div>
  );
}

export default IntelligenceHub;
