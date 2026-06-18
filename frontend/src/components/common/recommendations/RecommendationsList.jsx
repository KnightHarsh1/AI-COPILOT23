import { useEffect, useState } from "react";
import RecommendationService from "../../../services/recommendationService";

const PRIORITY_STYLES = {
  high: 'bg-risk-high/10 text-risk-high',
  medium: 'bg-risk-medium/10 text-risk-medium',
  low: 'bg-risk-low/10 text-risk-low',
};

function RecommendationsList() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      await RecommendationService.generateRecommendations();
      const data = await RecommendationService.getRecommendations('open');
      setRecommendations(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 rounded-xl bg-bg-subtle" />
        <div className="h-20 rounded-xl bg-bg-subtle" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-ink-muted">Couldn&rsquo;t load recommendations right now.</p>;
  }

  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No open recommendations — upload your latest business data to generate fresh ones.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation) => (
        <div key={recommendation.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="font-display font-semibold text-ink">{recommendation.title}</div>
            <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-semibold capitalize ${PRIORITY_STYLES[recommendation.priority] || PRIORITY_STYLES.medium}`}>
              {recommendation.priority || 'medium'} priority
            </span>
          </div>

          <p className="mt-1.5 text-sm text-ink-muted">{recommendation.reason}</p>

          {recommendation.actions?.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {recommendation.actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          )}

          {recommendation.expected_impact && (
            <p className="mt-2 text-sm font-medium text-gold">↗ {recommendation.expected_impact}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default RecommendationsList;
