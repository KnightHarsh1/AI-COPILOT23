// Streamlined navigation per the Command Center product spec. The dashboard
// IS the Command Center now; Forecast and Alerts are surfaced inside it
// (alerts in the Action Center, forecast in AI insights) rather than as
// separate top-level items. Nothing is removed — Import lives within the
// data tools, and the classic dashboard remains reachable at
// /app/dashboard-classic for anyone who wants it.
export const navItems = [
  { label: 'Command Center', path: '/app/dashboard' },
  { label: 'Upload', path: '/app/upload' },
  { label: 'Import', path: '/app/ingestion' },
  { label: 'Reports', path: '/app/reports' },
  { label: 'AI CFO', path: '/app/chat' },
  { label: 'Settings', path: '/app/settings' },
];
