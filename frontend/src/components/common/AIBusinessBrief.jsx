import { useEffect, useState } from 'react';
import DashboardBriefService from '../../services/dashboardBriefService';
import { formatRelativeTime } from '../../utils/formatters';

const CATEGORY_META = {
  customer_risk: { label: 'Customer Risk', sentiment: 'risk' },
  inventory_risk: { label: 'Inventory Risk', sentiment: 'risk' },
  expense_spike: { label: 'Expense Spike', sentiment: 'risk' },
  profitability: { label: 'Profitability', sentiment: 'risk' },
  revenue_opportunity: { label: 'Revenue Opportunity', sentiment: 'opportunity' },
  growth_opportunity: { label: 'Growth Opportunity', sentiment: 'opportunity' },
  general: { label: 'Overview', sentiment: 'neutral' },
};

const PRIORITY_META = {
  high: { label: 'High priority', className: 'bg-risk-high/10 text-risk-high' },
  medium: { label: 'Medium priority', className: 'bg-risk-medium/10 text-risk-medium' },
  low: { label: 'Low priority', className: 'bg-risk-low/10 text-risk-low' },
};

const SENTIMENT_BORDER = {
  risk: 'border-l-risk-high',
  opportunity: 'border-l-risk-low',
  neutral: 'border-l-primary',
};

function BriefItemCard({ item }) {
  const category = CATEGORY_META[item.category] || CATEGORY_META.general;
  const priority = PRIORITY_META[item.priority] || PRIORITY_META.medium;

  return (
    <div className={`rounded-xl border border-border border-l-4 ${SENTIMENT_BORDER[category.sentiment]} bg-bg-subtle p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{category.label}</span>
        <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${priority.className}`}>{priority.label}</span>
      </div>
      <p className="mt-2 font-display text-base font-semibold text-ink">{item.issue}</p>
      <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Reason: </span>{item.cause}</p>
      <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Action: </span>{item.recommendation}</p>
      <p className="mt-2 text-sm font-medium text-gold">↗ {item.expected_impact}</p>
    </div>
  );
}

function BriefSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 w-2/3 rounded bg-bg-subtle" />
      <div className="h-24 rounded-xl bg-bg-subtle" />
      <div className="h-24 rounded-xl bg-bg-subtle" />
    </div>
  );
}

function AIBusinessBrief() {
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    DashboardBriefService.getBrief()
      .then((data) => {
        if (isMounted) {
          setBrief(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI Business Brief</p>
        {brief?.generated_at && (
          <span className="text-xs text-ink-muted">Updated {formatRelativeTime(brief.generated_at)}</span>
        )}
      </div>

      {loading && <div className="mt-4"><BriefSkeleton /></div>}

      {!loading && error && (
        <p className="mt-4 text-sm text-ink-muted">
          We couldn&rsquo;t generate your brief right now. Try refreshing the page in a moment.
        </p>
      )}

      {!loading && !error && brief && (
        <>
          <h2 className="font-display mt-3 text-2xl font-bold text-ink">{brief.headline}</h2>

          {brief.items?.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {brief.items.map((item, index) => (
                <BriefItemCard key={`${item.category}-${index}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default AIBusinessBrief;
