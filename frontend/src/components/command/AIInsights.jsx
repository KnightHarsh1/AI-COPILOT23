const PRIORITY_DOT = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};

function AIInsights({ insights }) {
  const items = insights?.items || [];
  const headline = insights?.headline;

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why it&rsquo;s happening</p>
      <h2 className="font-display mt-1 text-xl font-bold text-ink">AI Insights</h2>
      {headline && <p className="mt-2 text-sm text-ink-muted">{headline}</p>}

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl bg-bg-subtle px-4 py-6 text-center text-sm text-ink-muted">
          Insights appear here once you&rsquo;ve imported some business data.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-subtle/50 p-4">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[item.priority] || PRIORITY_DOT.low}`} />
                <p className="text-sm font-semibold text-ink">{item.issue}</p>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                <span className="font-medium text-ink">Why:</span> {item.cause}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="font-medium text-ink">Do:</span> {item.recommendation}
              </p>
              {item.expected_impact && (
                <p className="mt-2 text-xs font-medium text-primary">{item.expected_impact}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default AIInsights;
