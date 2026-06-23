// Attention classification engine. Reuses the existing action-center output
// (today/week/month actions, each with category + priority + impact text) and
// classifies every item into exactly one of four executive severity levels:
// critical > action > watch > normal. No duplicate intelligence — this is a
// presentation/classification layer over data the engines already produce.

export const LEVELS = [
  { id: "critical", label: "Critical", emoji: "🔴", dot: "bg-risk-high", text: "text-risk-high", ring: "border-risk-high/30", soft: "bg-risk-high/10" },
  { id: "action", label: "Action Required", emoji: "🟠", dot: "bg-orange-500", text: "text-orange-500", ring: "border-orange-500/30", soft: "bg-orange-500/10" },
  { id: "watch", label: "Watch", emoji: "🟡", dot: "bg-gold", text: "text-gold", ring: "border-gold/30", soft: "bg-gold/10" },
  { id: "normal", label: "Normal", emoji: "🟢", dot: "bg-risk-low", text: "text-risk-low", ring: "border-risk-low/30", soft: "bg-risk-low/10" },
];

export const LEVEL_BY_ID = LEVELS.reduce((m, l) => ((m[l.id] = l), m), {});

// Categories that are inherently opportunities/positive → Normal.
const OPPORTUNITY_CATS = new Set(["opportunity", "market_opportunity"]);
// Categories that, at high priority, are genuinely critical.
const CRITICAL_CATS = new Set([
  "compliance", "liquidity_risk", "cash_flow_risk", "working_capital",
]);
// Watch-leaning categories (trends rather than immediate problems).
const WATCH_CATS = new Set(["market_risk", "reconciliation"]);

function classifyOne(action) {
  const cat = action.category || "general";
  const pri = action.priority || "low";

  if (OPPORTUNITY_CATS.has(cat)) return "normal";

  // High-priority compliance/cash/liquidity issues are critical.
  if (pri === "high" && CRITICAL_CATS.has(cat)) return "critical";

  // Other high-priority risks are action-required.
  if (pri === "high") return "action";

  // Medium priority: watch-leaning categories → watch, else action.
  if (pri === "medium") return WATCH_CATS.has(cat) ? "watch" : "action";

  // Low priority risks → watch; everything else → normal.
  return "watch";
}

// Pull a rupee figure out of impact/reason text when present, e.g.
// "₹1,20,000 outstanding" → 120000. Best-effort, for the impact rollup.
function extractAmount(action) {
  const text = `${action.expected_impact || ""} ${action.reason || ""} ${action.title || ""}`;
  // Match ₹ figures, optionally with L/Cr suffix.
  const m = text.match(/₹\s?([\d,]+(?:\.\d+)?)\s?(L|Lakh|lakh|Cr|crore)?/);
  if (!m) return 0;
  let val = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(val)) return 0;
  const suffix = (m[2] || "").toLowerCase();
  if (suffix === "l" || suffix === "lakh") val *= 100000;
  else if (suffix === "cr" || suffix === "crore") val *= 10000000;
  return val;
}

// Classify the whole action-center payload into level buckets + impact totals.
export function classifyActions(actionCenter) {
  const all = [
    ...((actionCenter && actionCenter.today) || []),
    ...((actionCenter && actionCenter.week) || []),
    ...((actionCenter && actionCenter.month) || []),
  ];

  const buckets = { critical: [], action: [], watch: [], normal: [] };
  let impactAtRisk = 0;

  for (const a of all) {
    const level = classifyOne(a);
    const item = { ...a, level };
    buckets[level].push(item);
    if (level === "critical" || level === "action") {
      impactAtRisk += extractAmount(a);
    }
  }

  // Overall status = highest non-empty level.
  let overall = "normal";
  for (const l of LEVELS) {
    if (buckets[l.id].length > 0) { overall = l.id; break; }
  }

  const counts = {
    critical: buckets.critical.length,
    action: buckets.action.length,
    watch: buckets.watch.length,
    normal: buckets.normal.length,
    all: all.length,
  };

  // Most urgent = first critical, else first action, else first watch.
  const mostUrgent = buckets.critical[0] || buckets.action[0] || buckets.watch[0] || null;

  return { buckets, counts, overall, impactAtRisk, mostUrgent, all };
}

// Friendly source label from an action's category.
const SOURCE_LABELS = {
  collections: "Collections Intelligence",
  customer_risk: "Customer Intelligence",
  opportunity: "Opportunity Intelligence",
  market_opportunity: "Market Radar",
  market_risk: "Market Radar",
  liquidity_risk: "Financial Strength",
  working_capital: "Financial Strength",
  debt_risk: "Financial Strength",
  cash_flow_risk: "Cash Flow Intelligence",
  profitability: "Profitability Intelligence",
  inventory_risk: "Product Intelligence",
  reconciliation: "Bank Reconciliation",
  compliance: "Compliance Intelligence",
  general: "Business Intelligence",
};

export function sourceLabel(category) {
  return SOURCE_LABELS[category] || "Business Intelligence";
}
