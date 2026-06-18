import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems } from '../../constants/nav';
import DashboardService from '../../services/dashboardService';

function Sidebar() {
  const { pathname } = useLocation();
  const [pulse, setPulse] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    DashboardService.getSummary()
      .then((data) => {
        if (isMounted) setPulse(data);
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const healthLabel = (score) => {
    if (score >= 85) return { text: 'Excellent', tone: 'text-risk-low' };
    if (score >= 70) return { text: 'Healthy', tone: 'text-risk-low' };
    if (score >= 55) return { text: 'Watch closely', tone: 'text-risk-medium' };
    return { text: 'At risk', tone: 'text-risk-high' };
  };

  return (
    <aside className="hidden w-full max-w-xs shrink-0 rounded-card bg-sidebar-bg p-6 text-sidebar-ink lg:block">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-muted">Workspace</p>
        <h2 className="font-display text-2xl font-semibold text-white">Executive summary</h2>
        <p className="text-sm leading-6 text-sidebar-muted">
          A quick view of your company performance, alerts, and recommended actions.
        </p>
      </div>

      <div className="mt-10 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-sidebar-active text-white shadow-sm'
                  : 'text-sidebar-ink hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm font-semibold text-white">Today&rsquo;s pulse</p>

        {error && (
          <p className="mt-3 text-xs text-sidebar-muted">Couldn&rsquo;t load live data right now.</p>
        )}

        {!error && (
          <dl className="mt-4 space-y-3 text-sm text-sidebar-muted">
            <div className="flex items-center justify-between">
              <dt>Open alerts</dt>
              <dd className="figure font-semibold text-white">
                {pulse ? pulse.open_alerts : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Open recommendations</dt>
              <dd className="figure font-semibold text-white">
                {pulse ? pulse.open_recommendations : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Health score</dt>
              <dd className={`figure font-semibold ${pulse ? healthLabel(pulse.health_score).tone : 'text-white'}`}>
                {pulse ? `${Math.round(pulse.health_score)} · ${healthLabel(pulse.health_score).text}` : '—'}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
