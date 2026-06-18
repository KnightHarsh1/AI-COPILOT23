import { Link } from 'react-router-dom';

const VALUE_PROPS = [
  {
    title: 'Customer & inventory risk',
    body: 'Know the moment one customer or a stockout starts putting revenue at risk.',
  },
  {
    title: 'Revenue & growth opportunities',
    body: 'Get told where momentum is building, not just where the bar chart went up.',
  },
  {
    title: 'A daily AI brief, not a dashboard',
    body: 'One page that explains what changed, why, and what to do about it next.',
  },
];

function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display flex items-center gap-2 text-lg font-bold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm text-white">B</span>
          Business Copilot
        </span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="rounded-pill px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link to="/register" className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            Get started free
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">AI Business Copilot for Indian SMBs</p>
          <h1 className="font-display mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Stop reading dashboards.<br />Start getting told what to do.
          </h1>
          <p className="mt-6 text-lg leading-7 text-ink-muted">
            Upload your sales and expenses. Business Copilot reads them like a CFO would — then tells you, in
            plain language, what&rsquo;s working, what&rsquo;s at risk, and what to do next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-hover">
              Get started free
            </Link>
            <Link to="/login" className="rounded-pill border border-border px-6 py-3 text-sm font-semibold text-ink hover:bg-bg-subtle">
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI Business Brief — preview</p>
          <h2 className="font-display mt-3 text-xl font-bold text-ink">Revenue grew 18% this month — here&rsquo;s how to keep it going.</h2>
          <div className="mt-5 rounded-xl border border-border border-l-4 border-l-risk-low bg-bg-subtle p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Growth Opportunity</span>
              <span className="rounded-pill bg-risk-low/10 px-2.5 py-0.5 text-xs font-semibold text-risk-low">High priority</span>
            </div>
            <p className="mt-2 font-display text-base font-semibold text-ink">Repeat orders are driving growth</p>
            <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Reason: </span>Your top 5 customers placed 40% more orders than last month.</p>
            <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">Action: </span>Launch a referral offer to turn this momentum into new customers.</p>
            <p className="mt-2 text-sm font-medium text-gold">↗ Could add ₹40,000–60,000 in new monthly revenue</p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-subtle">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3">
          {VALUE_PROPS.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
