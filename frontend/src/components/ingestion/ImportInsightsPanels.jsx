// Import-wizard analysis panels: data profiling, AI file understanding, and
// business-analysis readiness. All fed by the live /analyze response — no mock
// data. Rendered above the mapping table so the owner understands the file
// before mapping/importing it.

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={`figure mt-0.5 text-lg font-bold ${tone || "text-ink"}`}>{value}</p>
    </div>
  );
}

export function ProfilingPanel({ profiling }) {
  if (!profiling) return null;
  const p = profiling;
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-ink">File profile</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Rows" value={(p.rows ?? 0).toLocaleString("en-IN")} />
        <Stat label="Columns" value={p.columns ?? 0} />
        <Stat label="Missing values" value={`${p.missing_pct ?? 0}%`} tone={p.missing_pct > 10 ? "text-gold" : "text-ink"} />
        <Stat label="Duplicate rows" value={(p.duplicate_rows ?? 0).toLocaleString("en-IN")} tone={p.duplicate_rows > 0 ? "text-gold" : "text-ink"} />
        {p.date_range && <Stat label="Date range" value={`${p.date_range.start} – ${p.date_range.end}`} />}
        <Stat label="Currency" value={p.currency || "INR"} />
        {p.unique_customers != null && <Stat label="Unique customers" value={p.unique_customers.toLocaleString("en-IN")} />}
        {p.unique_products != null && <Stat label="Unique products" value={p.unique_products.toLocaleString("en-IN")} />}
      </div>

      {p.outliers && p.outliers.length > 0 && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <p className="text-sm font-semibold text-gold">Unusual values to review</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
            {p.outliers.slice(0, 4).map((o, i) => (
              <li key={i}>
                <span className="font-medium text-ink">{o.column}</span>: ₹{Number(o.value).toLocaleString("en-IN")}{" "}
                <span className="text-xs">(typical ≈ ₹{Number(o.typical).toLocaleString("en-IN")})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function AIUnderstandingPanel({ documentType, confidence, mapping }) {
  if (!documentType) return null;
  const pct = Math.round((confidence || 0) * 100);
  const mappedFields = new Set((mapping || []).map((m) => m.suggested_field).filter(Boolean));

  const TYPE_LABELS = {
    sales: "Sales data", expense: "Expense data", customer: "Customer data",
    inventory: "Inventory data", bank_statement: "Bank statement",
    balance_sheet: "Balance sheet", profit_and_loss: "P&L statement", unknown: "Business data",
  };

  const contains = [];
  if ([...mappedFields].some((f) => ["amount", "revenue", "sales", "total"].includes(f))) contains.push("Revenue");
  if ([...mappedFields].some((f) => ["customer_name", "customer", "client", "party"].includes(f))) contains.push("Customers");
  if ([...mappedFields].some((f) => ["product_name", "product", "item", "sku"].includes(f))) contains.push("Products");
  if ([...mappedFields].some((f) => ["tax", "gst", "cgst", "sgst", "igst"].includes(f))) contains.push("Taxes");
  if ([...mappedFields].some((f) => ["invoice_date", "date", "incurred_date"].includes(f))) contains.push("Dates");

  const missing = [];
  if (documentType === "sales" && ![...mappedFields].some((f) => ["cost", "cogs"].includes(f))) missing.push("Cost data");

  const tone = pct >= 80 ? "text-risk-low" : pct >= 55 ? "text-gold" : "text-risk-high";

  return (
    <section className="rounded-card border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">AI</span>
        <h3 className="font-display text-base font-semibold text-ink">I analysed this file</h3>
        <span className={`ml-auto figure text-sm font-bold ${tone}`}>{pct}% confident</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Detected</p>
          <p className="mt-1 font-semibold text-ink">✓ {TYPE_LABELS[documentType] || documentType}</p>
        </div>
        {contains.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Contains</p>
            <ul className="mt-1 space-y-0.5">
              {contains.map((c) => <li key={c} className="text-risk-low">✓ {c}</li>)}
            </ul>
          </div>
        )}
        {missing.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Missing</p>
            <ul className="mt-1 space-y-0.5">
              {missing.map((m) => <li key={m} className="text-gold">⚠ {m}</li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReadinessPanel({ readiness }) {
  if (!readiness) return null;
  const r = readiness;
  const scoreTone = r.score >= 75 ? "text-risk-low" : r.score >= 50 ? "text-gold" : "text-risk-high";
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink">Business analysis readiness</h3>
        <span className={`figure text-2xl font-bold ${scoreTone}`}>{r.score}<span className="text-sm text-ink-muted">/100</span></span>
      </div>
      <div className="mt-3 space-y-2">
        {r.areas.map((a) => (
          <div key={a.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{a.label}</span>
              <span className="figure font-semibold text-ink">{a.pct === 0 ? "Missing" : `${a.pct}%`}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${a.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-pill bg-bg-subtle px-3 py-1 text-ink-muted">Forecast confidence: <span className="font-semibold text-ink">{r.forecast_confidence}</span></span>
        <span className="rounded-pill bg-bg-subtle px-3 py-1 text-ink-muted">AI confidence: <span className="font-semibold text-ink">{r.ai_confidence}</span></span>
      </div>
    </section>
  );
}
