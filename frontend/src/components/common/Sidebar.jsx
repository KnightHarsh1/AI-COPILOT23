import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppearance } from '../../context/AppearanceContext';
import { NAV_ICONS, SECTION_ICONS, INTEL_ICONS } from './navIcons';
import CommandCenterService from '../../services/commandCenterService';
import { LEVELS, LEVEL_BY_ID, classifyActions } from '../command/attentionEngine';
import { formatCurrency } from '../../utils/formatters';

// Hierarchical, accordion-style navigation groups. Each top-level group expands
// to reveal submenu items that navigate (and, for Command Center, switch the
// dashboard tab via ?tab= + smooth scroll to the section).
const NAV_GROUPS = [
  {
    label: 'Command Center', path: '/app/dashboard',
    children: [
      { label: 'Today', tab: 'today', section: 'today-section' },
      { label: 'Risks & Opportunities', tab: 'risks' },
      { label: 'Daily Actions', tab: 'actions' },
      { label: 'Intelligence', tab: 'intelligence', section: 'intelligence-section' },
      { label: 'Customer Intelligence', tab: 'intelligence', intel: 'customer', sub: true },
      { label: 'Inventory Intelligence', tab: 'intelligence', intel: 'product', sub: true },
      { label: 'Cash Flow Intelligence', tab: 'intelligence', intel: 'cashflow', sub: true },
      { label: 'Financial Position', tab: 'intelligence', intel: 'financial', sub: true },
      { label: 'Profitability (P&L)', tab: 'intelligence', intel: 'profit', sub: true },
      { label: 'Collections Intelligence', tab: 'intelligence', intel: 'collections', sub: true },
      { label: 'Compliance Intelligence', tab: 'intelligence', intel: 'compliance', sub: true },
      { label: 'GST Intelligence', tab: 'intelligence', intel: 'gst', sub: true },
      { label: 'Opportunity Intelligence', tab: 'intelligence', intel: 'opportunity', sub: true },
      { label: 'Market Radar', tab: 'intelligence', intel: 'market', sub: true },
      { label: 'Goals & Trends', tab: 'goals' },
    ],
  },
  {
    label: 'Data Center', path: '/app/data-center',
    children: [
      { label: 'Upload Center', q: 'tab=import' },
      { label: 'Import History', q: 'tab=history' },
      { label: 'Data Coverage', q: 'tab=coverage' },
      { label: 'Data Freshness', q: 'tab=freshness' },
      { label: 'Data Dictionary', q: 'tab=dictionary' },
    ],
  },
  {
    label: 'Reports', path: '/app/reports',
    children: [
      { label: 'Executive Summary', q: 'type=executive_summary' },
      { label: 'Financial Report', q: 'type=financial' },
      { label: 'Cash Flow Report', q: 'type=cash_flow' },
      { label: 'Export Center', q: 'tab=export' },
    ],
  },
  {
    label: 'AI CFO', path: '/app/chat',
    children: [
      { label: 'Ask AI CFO', path: '/app/chat' },
      { label: 'Business Briefing', path: '/app/dashboard', q: 'tab=today' },
      { label: 'Forecasts', path: '/app/forecast' },
    ],
  },
  {
    label: 'Settings', path: '/app/settings',
    children: [
      { label: 'Company Profile', path: '/app/settings', q: 'section=business' },
      { label: 'Notifications', path: '/app/settings', q: 'section=notifications' },
      { label: 'Users & Roles', path: '/app/settings', q: 'section=users' },
      { label: 'Preferences', path: '/app/settings', q: 'section=appearance' },
    ],
  },
];

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300" style={{ transform: open ? 'rotate(90deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AttentionMeterMini({ result, navigate }) {
  const { counts, overall, impactAtRisk } = result;
  const overallLevel = LEVEL_BY_ID[overall];
  const totalActive = counts.critical + counts.action + counts.watch + counts.normal;

  const go = (level) => navigate(`/app/dashboard?tab=actions&level=${level}`);

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-sidebar-ink">Business attention</p>
      <p className="mt-0.5 text-[11px] text-sidebar-muted">What needs attention right now</p>

      {/* Overall status */}
      <div className="mt-3 rounded-lg bg-black/20 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-muted">Overall status</p>
        <p className={`mt-0.5 text-sm font-bold ${overallLevel.text}`}>{overallLevel.emoji} {overallLevel.label}</p>
        {impactAtRisk > 0 && <p className="figure mt-1 text-sm font-bold text-risk-high">{formatCurrency(impactAtRisk)} at risk</p>}
      </div>

      {/* Levels — whole row clickable */}
      <div className="mt-3 space-y-1.5">
        {LEVELS.map((lvl) => {
          const count = counts[lvl.id];
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => go(lvl.id)}
              title={`${lvl.label}: ${count} item${count === 1 ? '' : 's'}`}
              className="group flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm transition hover:border-white/15 hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${lvl.dot}`} />
                <span className="text-sidebar-ink">{lvl.label}</span>
              </span>
              <span className="figure font-semibold text-sidebar-ink">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-sidebar-muted">
        <span>Total active: <span className="figure font-semibold text-sidebar-ink">{totalActive}</span></span>
        {impactAtRisk > 0 && <span className="figure font-semibold text-sidebar-ink">{formatCurrency(impactAtRisk)}</span>}
      </div>
    </div>
  );
}

function Sidebar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { appearance } = useAppearance();
  const activeIntel = new URLSearchParams(search).get('intel');
  const [data, setData] = useState(null);
  // Compact mode hides the heavier attention-meter detail and tightens the rail.
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const compact = appearance.sidebarMode === 'compact' || manualCollapsed;
  const [openGroup, setOpenGroup] = useState(() => {
    const active = NAV_GROUPS.find((g) => pathname.startsWith(g.path));
    return active ? active.label : 'Command Center';
  });

  useEffect(() => {
    let mounted = true;
    CommandCenterService.getCommandCenter()
      .then((d) => { if (mounted) setData(d); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const goSubmenu = (group, child) => {
    // Dashboard tabs/intel modules scroll within the single-page command center.
    if ((group.path === '/app/dashboard' || child.path === '/app/dashboard') && child.tab) {
      const q = child.intel ? `?tab=${child.tab}&intel=${child.intel}` : `?tab=${child.tab}`;
      navigate(`/app/dashboard${q}`);
      const target = child.section || (child.intel ? 'intelligence-section' : null);
      if (target && typeof document !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById(target);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
      return;
    }
    // Explicit destination path (optionally with a query string).
    const dest = child.path || group.path;
    const q = child.q ? `?${child.q}` : '';
    navigate(`${dest}${q}`);
  };

  const result = classifyActions(data?.action_center);

  return (
    <aside className={`hidden shrink-0 rounded-card bg-sidebar-bg p-6 text-sidebar-ink transition-all duration-300 lg:block ${compact ? 'w-full max-w-[88px]' : 'w-full max-w-xs'}`}>
      <div className="flex items-center justify-between">
        {!compact && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-muted">Workspace</p>
            <h2 className="font-display text-xl font-semibold text-sidebar-ink">Navigation</h2>
          </div>
        )}
        <button
          type="button"
          onClick={() => setManualCollapsed((v) => !v)}
          aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-muted transition hover:bg-white/10 hover:text-white"
        >
          {compact ? '»' : '«'}
        </button>
      </div>

      {/* Accordion nav */}
      <nav className={`space-y-1 ${compact ? 'mt-4' : 'mt-6'}`}>
        {NAV_GROUPS.map((group) => {
          const groupActive = pathname.startsWith(group.path);
          const expanded = !compact && openGroup === group.label;
          if (compact) {
            // Compact: show only the top-level entries as initials/short labels.
            const GroupIcon = NAV_ICONS[group.label];
            return (
              <button
                key={group.label}
                type="button"
                onClick={() => navigate(group.path)}
                title={group.label}
                className={`flex w-full items-center justify-center rounded-xl px-2 py-2.5 transition ${groupActive ? 'bg-sidebar-active text-white' : 'text-sidebar-ink hover:bg-white/5'}`}
              >
                {GroupIcon ? <GroupIcon size={20} strokeWidth={2} /> : group.label.slice(0, 2)}
              </button>
            );
          }
          const GroupIcon = NAV_ICONS[group.label];
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => { setOpenGroup(expanded ? null : group.label); if (!groupActive) navigate(group.path); }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  groupActive ? 'bg-sidebar-active text-white shadow-sm' : 'text-sidebar-ink hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {GroupIcon && <GroupIcon size={18} strokeWidth={2} className={groupActive ? 'text-white' : 'text-sidebar-muted'} />}
                  {group.label}
                </span>
                <Chevron open={expanded} />
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                      {group.children.map((child) => {
                        const isActiveIntel = child.intel && activeIntel === child.intel && pathname.startsWith('/app/dashboard');
                        const ChildIcon = child.intel ? INTEL_ICONS[child.intel] : (child.tab ? SECTION_ICONS[child.tab] : null);
                        return (
                          <button
                            key={child.label}
                            type="button"
                            onClick={() => goSubmenu(group, child)}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left font-medium transition hover:bg-white/5 hover:text-white ${child.sub ? 'pl-5 text-[12px]' : 'text-[13px]'} ${isActiveIntel ? 'bg-white/10 text-white' : 'text-sidebar-muted'}`}
                          >
                            {ChildIcon && <ChildIcon size={child.sub ? 13 : 15} strokeWidth={2} className="shrink-0 opacity-80" />}
                            <span className="truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Business Attention Meter — replaces Today's Pulse */}
      {!compact && <AttentionMeterMini result={result} navigate={navigate} />}
    </aside>
  );
}

export default Sidebar;
