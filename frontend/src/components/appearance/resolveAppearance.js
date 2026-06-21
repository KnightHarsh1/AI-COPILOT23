// Resolves the active appearance into concrete component choices.
// - In CUSTOM mode, the user's individual picks win.
// - Otherwise the chosen preset dashboard theme maps to a fixed set.
// "classic" reproduces the original dashboard exactly.

const THEME_PRESETS = {
  classic: {
    kpiStyle: "classic",
    mainChart: "classic",
    healthStyle: "classic",
    insightsStyle: "classic",
    alertsStyle: "classic",
    recommendationsStyle: "classic",
    layoutMode: "standard",
  },
  modern: {
    kpiStyle: "sparklines",
    mainChart: "gradientArea",
    healthStyle: "ring",
    insightsStyle: "cards",
    alertsStyle: "timeline",
    recommendationsStyle: "cards",
    layoutMode: "analytics",
  },
  executive: {
    kpiStyle: "executive",
    mainChart: "executiveTrend",
    healthStyle: "gauge",
    insightsStyle: "executive",
    alertsStyle: "priority",
    recommendationsStyle: "actionPlan",
    layoutMode: "executive",
  },
  finance: {
    kpiStyle: "classic",
    mainChart: "stacked",
    healthStyle: "credit",
    insightsStyle: "cards",
    alertsStyle: "matrix",
    recommendationsStyle: "cards",
    layoutMode: "analytics",
  },
  command: {
    kpiStyle: "command",
    mainChart: "waterfall",
    healthStyle: "orb",
    insightsStyle: "command",
    alertsStyle: "feed",
    recommendationsStyle: "advisor",
    layoutMode: "command",
  },
};

export function resolveAppearance(appearance) {
  const a = appearance || {};
  if (a.customMode) {
    return {
      kpiStyle: a.kpiStyle,
      mainChart: a.mainChart,
      healthStyle: a.healthStyle,
      healthSkin: a.healthSkin,
      insightsStyle: a.insightsStyle,
      alertsStyle: a.alertsStyle,
      recommendationsStyle: a.recommendationsStyle,
      density: a.density,
      animationLevel: a.animationLevel,
      layoutMode: a.layoutMode,
    };
  }
  const preset = THEME_PRESETS[a.dashboardTheme] || THEME_PRESETS.classic;
  return {
    ...preset,
    healthSkin: a.healthSkin || "classic",
    density: a.density || "comfortable",
    animationLevel: a.animationLevel || "standard",
  };
}

export const THEME_LABELS = {
  classic: "Classic Business Copilot",
  modern: "Modern Analytics",
  executive: "Executive CFO",
  finance: "Finance Pro",
  command: "AI Command Center",
};
