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
import InsightsPanel from "../appearance/InsightsPanel";

// Intelligence Hub — a two-level navigation that eliminates the long scroll.
// Level 1: category tabs (only one module visible at a time). Level 2: each
// module renders its existing card/widget unchanged. No pagination, no removed
// intelligence — just focused navigation over the same data and components.

const CATEGORIES = [
  { id: "customer", label: "Customer" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "financial", label: "Financial Position" },
  { id: "collections", label: "Collections" },
  { id: "product", label: "Inventory" },
  { id: "profit", label: "Profit" },
  { id: "compliance", label: "Compliance" },
  { id: "gst", label: "GST" },
  { id: "opportunity", label: "Opportunity" },
  { id: "market", label: "Market" },
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
  const VALID = ["customer", "cashflow", "financial", "collections", "product", "profit", "compliance", "gst", "opportunity", "market"];
  const [cat, setCat] = useState(VALID.includes(initialCategory) ? initialCategory : "customer");
  useEffect(() => {
    if (VALID.includes(initialCategory)) setCat(initialCategory);
  }, [initialCategory]);

  // Which categories actually have data, for subtle availability dots.
  const has = {
    customer: !!(data.customers && data.customers.available),
    cashflow: !!(data.cash_flow && data.cash_flow.available),
    collections: !!(data.collections && data.collections.available),
    product: !!(data.product && data.product.available),
    profit: !!(data.profitability && data.profitability.available),
    financial: !!(data.balance_sheet && data.balance_sheet.available),
    compliance: !!(data.compliance && data.compliance.available),
    gst: !!(data.gst && data.gst.available),
    opportunity: !!(data.opportunities && data.opportunities.available),
    market: !!(data.market && data.market.available),
  };

  const render = () => {
    switch (cat) {
      case "customer":
        return has.customer ? <CustomerIntelligenceCard customers={data.customers} /> : <EmptyModule label="Customer" />;
      case "cashflow":
        return has.cashflow ? <CashFlowCard cashFlow={data.cash_flow} /> : <EmptyModule label="Cash flow" />;
      case "financial":
        return has.financial ? <BalanceSheetCard balanceSheet={data.balance_sheet} /> : <EmptyModule label="Financial position" />;
      case "collections":
        return <CollectionsWidget data={data.collections} />;
      case "product":
        return <ProductWidget data={data.product} />;
      case "profit":
        return has.profit ? <ProfitabilityCard profitability={data.profitability} /> : <EmptyModule label="Profitability" />;
      case "compliance":
        return <ComplianceWidget data={data.compliance} onSetup={onSetup} />;
      case "gst":
        return has.gst ? <GstCard gst={data.gst} /> : <EmptyModule label="GST" />;
      case "opportunity":
        return has.opportunity ? <OpportunityCard opportunities={data.opportunities} /> : <EmptyModule label="Opportunity" />;
      case "market":
        return <MarketRadarWidget data={data.market} onSetup={onProfile} onChanged={onReload} />;
      default:
        return null;
    }
  };

  return (
    <div id="intelligence-section" className="space-y-5">
      {/* Level 1 — category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => {
          const active = cat === c.id;
          const Icon = INTEL_ICONS[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition ${
                active ? "border-primary bg-primary text-white shadow-card" : "border-border text-ink-muted hover:bg-bg-subtle hover:text-ink"
              }`}
            >
              {Icon && <Icon size={15} strokeWidth={2} />}
              {c.label}
              {has[c.id] && !active && <span className="h-1.5 w-1.5 rounded-full bg-risk-low" />}
            </button>
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
