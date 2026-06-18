import { useEffect, useState } from "react";
import AlertService from "../../../services/alertService";

const SEVERITY_STYLES = {
  critical: 'bg-risk-high/10 text-risk-high',
  high: 'bg-risk-high/10 text-risk-high',
  medium: 'bg-risk-medium/10 text-risk-medium',
  low: 'bg-risk-low/10 text-risk-low',
};

function AlertsList() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await AlertService.getAlerts('open');
      setAlerts(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 rounded-xl bg-bg-subtle" />
        <div className="h-16 rounded-xl bg-bg-subtle" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-ink-muted">Couldn&rsquo;t load alerts right now.</p>;
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-ink-muted">No open alerts — everything looks under control.</p>;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <div className="font-display font-semibold text-ink">{alert.title}</div>
            <div className="mt-1 text-sm text-ink-muted">{alert.description}</div>
          </div>
          <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium}`}>
            {alert.severity}
          </span>
        </div>
      ))}
    </div>
  );
}

export default AlertsList;
