import { useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import AlertService from '../services/alertService';

const SEVERITY_STYLES = {
  critical: 'bg-risk-high/10 text-risk-high',
  high: 'bg-risk-high/10 text-risk-high',
  medium: 'bg-risk-medium/10 text-risk-medium',
  low: 'bg-risk-low/10 text-risk-low',
};

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await AlertService.getAlerts();
        setAlerts(data);
      } catch (error) {
        // Handled by the empty state below.
      }
    };

    loadAlerts();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">Alerts</h1>
              <p className="mt-2 text-sm text-ink-muted">Review active and historical business alerts generated from KPI and health score patterns.</p>
            </div>
            <div className="rounded-card bg-bg-subtle px-4 py-3 text-sm font-medium text-ink">
              {alerts.length} alerts found
            </div>
          </div>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            {alerts.length === 0 ? (
              <div className="rounded-card border border-border bg-bg-subtle p-6 text-ink-muted">
                No alerts are available right now.
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-card border border-border p-5 shadow-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-ink-muted">{alert.alert_type.replace('_', ' ')}</p>
                        <h2 className="font-display mt-2 text-xl font-semibold text-ink">{alert.title}</h2>
                        <p className="mt-3 text-sm leading-6 text-ink-muted">{alert.description}</p>
                      </div>
                      <div className="space-y-2 text-right">
                        <span className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${SEVERITY_STYLES[alert.severity] || 'bg-bg-subtle text-ink-muted'}`}>
                          {alert.severity}
                        </span>
                        <p className="text-sm text-ink-muted">Status: {alert.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AlertsPage;
