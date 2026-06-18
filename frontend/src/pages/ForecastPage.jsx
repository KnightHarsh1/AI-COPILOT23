import { useEffect, useState } from "react";

import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";

import ForecastService from "../services/forecastService";

function ForecastPage() {
  const [forecast, setForecast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadForecast = async () => {
      try {
        const data = await ForecastService.getForecast();
        setForecast(data.forecast);
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
              <div className="whitespace-pre-wrap text-sm leading-6 text-ink">{forecast}</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default ForecastPage;
