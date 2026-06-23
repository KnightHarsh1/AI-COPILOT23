// Central icon registry using Lucide React. Keeping every nav/category icon in
// one place means the sidebar, navbar, tabs, and intelligence hub all stay in
// sync. Import the map and look up by key — never re-declare icons inline.
import {
  LayoutDashboard, Database, BarChart3, Bot, Settings as SettingsIcon,
  Sun, ShieldAlert, CheckSquare, Brain, Target,
  Users, Package, Wallet, Building2, TrendingUp, Coins, ClipboardCheck,
  Receipt, Rocket, Radar,
} from "lucide-react";

// Top-level navigation groups.
export const NAV_ICONS = {
  "Command Center": LayoutDashboard,
  "Data Center": Database,
  Reports: BarChart3,
  "AI CFO": Bot,
  Settings: SettingsIcon,
};

// Command Center sub-sections / dashboard tabs.
export const SECTION_ICONS = {
  today: Sun,
  risks: ShieldAlert,
  actions: CheckSquare,
  intelligence: Brain,
  goals: Target,
};

// Intelligence Hub categories (ids match IntelligenceHub CATEGORIES).
export const INTEL_ICONS = {
  customer: Users,
  product: Package,        // Inventory Intelligence
  cashflow: Wallet,
  financial: Building2,    // Financial Position
  profit: TrendingUp,      // Profitability
  collections: Coins,
  compliance: ClipboardCheck,
  gst: Receipt,
  opportunity: Rocket,
  market: Radar,
};
