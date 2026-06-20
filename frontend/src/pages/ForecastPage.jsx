import { useEffect, useState } from "react";

import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";

import ForecastService from "../services/forecastService";

function ForecastPage() {
  const [forecast, setForecast] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadForecast = async () => {
      try {
        const data = await ForecastService.getForecast();
        setForecast(data.forecast);
        setConfidence(data.confidence || null);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadForecast();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />

        <main className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h1 className="font-display text-3xl font-bold text-ink">Business Forecast</h1>
            <p className="mt-2 text-ink-muted">AI-generated forecast for the next 30 days.</p>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            {loading && <p className="text-ink-muted">Loading forecast...</p>}
            {!loading && error && (
              <p className="text-sm text-risk-high">Couldn&rsquo;t load your forecast right now. Try again shortly.</p>
            )}
            {!loading && !error && (
              <>
                {confidence && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
                    <span className={`rounded-pill px-3 py-1 text-xs font-bold ${confidence.level === 'High' ? 'bg-risk-low/15 text-risk-low' : confidence.level === 'Medium' ? 'bg-risk-medium/15 text-risk-medium' : 'bg-risk-high/15 text-risk-high'}`}>
                      {confidence.level} confidence · {confidence.score}%
                    </span>
                    <span className="text-xs text-ink-muted">{confidence.basis} {confidence.caveat}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-6 text-ink">{forecast}</div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default ForecastPage;
