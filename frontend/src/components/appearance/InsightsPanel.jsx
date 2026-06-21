import AIInsights from "../command/AIInsights";

// Renders AI insights in the selected style. Same live data, different layout.
// "classic" delegates to the original component so nothing changes by default.
function InsightsPanel({ insights, variant = "classic" }) {
  if (variant === "classic") return <AIInsights insights={insights} />;

  const items = insights?.items || [];
  const headline = insights?.headline;

  if (items.length === 0) {
    return (
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-xl font-bold text-ink">AI Insights</h2>
        <p className="mt-4 rounded-xl bg-bg-subtle px-4 py-6 text-center text-sm text-ink-muted">
          Insights appear here once you&rsquo;ve imported some business data.
        </p>
      </section>
    );
  }

  if (variant === "chat") {
    return (
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">AI</span>
          <h2 className="font-display text-lg font-bold text-ink">AI CFO insights</h2>
        </div>
        {headline && <p className="mt-3 rounded-2xl rounded-tl-sm bg-bg-subtle px-4 py-3 text-sm text-ink">{headline}</p>}
        <div className="mt-3 space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl rounded-tl-sm bg-primary/5 px-4 py-3 text-sm">
              <p className="font-semibold text-ink">{it.issue}</p>
              <p className="mt-1 text-ink-muted"><span className="font-medium text-ink">Why:</span> {it.cause}</p>
              <p className="mt-1 text-ink-muted"><span className="font-medium text-ink">Do:</span> {it.recommendation}</p>
              {it.expected_impact && <p className="mt-2 text-xs font-medium text-primary">{it.expected_impact}</p>}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "executive") {
    return (
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-lg font-bold text-ink">Executive summary</h2>
        {headline && <p className="mt-2 text-sm text-ink-muted">{headline}</p>}
        <ul className="mt-4 space-y-3">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3 border-l-2 border-primary/40 pl-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{it.issue}</p>
                <p className="text-sm text-ink-muted">{it.recommendation}{it.expected_impact ? ` — ${it.expected_impact}` : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (variant === "command") {
    return (
      <section className="rounded-card border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI command · insights</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-primary/20 bg-surface/60 p-4 backdrop-blur">
              <p className="text-sm font-semibold text-ink">{it.issue}</p>
              <p className="mt-1 text-sm text-ink-muted">{it.cause}</p>
              <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Action:</span> {it.recommendation}</p>
              {it.expected_impact && <p className="mt-2 text-xs font-medium text-primary">{it.expected_impact}</p>}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // cards
  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-lg font-bold text-ink">AI Insights</h2>
      {headline && <p className="mt-2 text-sm text-ink-muted">{headline}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-subtle/50 p-4">
            <p className="text-sm font-semibold text-ink">{it.issue}</p>
            <p className="mt-2 text-sm text-ink-muted">{it.recommendation}</p>
            {it.expected_impact && <p className="mt-2 text-xs font-medium text-primary">{it.expected_impact}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default InsightsPanel;
