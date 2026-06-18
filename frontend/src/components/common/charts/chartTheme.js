// Shared recharts theming so all charts respect the app's design tokens
// and automatically adapt between light/dark mode (CSS vars resolve live).
export const CHART_COLORS = {
  primary: 'rgb(var(--c-primary))',
  gold: 'rgb(var(--c-gold))',
  riskHigh: 'rgb(var(--c-risk-high))',
  riskLow: 'rgb(var(--c-risk-low))',
  ink: 'rgb(var(--c-ink))',
  inkMuted: 'rgb(var(--c-ink-muted))',
  border: 'rgb(var(--c-border))',
  surface: 'rgb(var(--c-surface))',
};

export const PIE_PALETTE = [
  'rgb(var(--c-primary))',
  'rgb(var(--c-gold))',
  'rgb(var(--c-risk-low))',
  'rgb(var(--c-risk-high))',
  'rgb(var(--c-sidebar-active))',
];

export const axisTickStyle = { fill: CHART_COLORS.inkMuted, fontSize: 12 };

export const tooltipContentStyle = {
  backgroundColor: CHART_COLORS.surface,
  border: `1px solid ${CHART_COLORS.border}`,
  borderRadius: 12,
  color: CHART_COLORS.ink,
  fontSize: 13,
};
