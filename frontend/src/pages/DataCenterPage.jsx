import { Fragment, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import IngestionWizard from "../components/ingestion/IngestionWizard";
import ImportImpactReport from "../components/ingestion/ImportImpactReport";
import GrowthService from "../services/growthService";
import { ingestionService } from "../services/ingestionService";
import { useAccessProfile } from "../context/AccessProfileContext";
import { formatDate } from "../utils/formatters";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "import", label: "Advanced Import" },
  { id: "history", label: "Import History" },
  { id: "coverage", label: "Data Coverage" },
  { id: "freshness", label: "Data Freshness" },
  { id: "dictionary", label: "Data Dictionary" },
];

// What each data area unlocks — drives the upload recommendations.
const UNLOCKS = [
  { key: "sales", label: "Sales Data", unlocks: "Revenue, Collections & Customer intelligence" },
  { key: "expenses", label: "Expense Data", unlocks: "Profit Intelligence & Health Score" },
  { key: "inventory", label: "Inventory Data", unlocks: "Product Intelligence & stockout alerts" },
  { key: "customers", label: "Customer Data", unlocks: "Customer insights & churn signals" },
];

function DataCenterPage() {
  const _dcLoc = useLocation();
  const _validTabs = ["overview", "import", "history", "coverage", "freshness", "dictionary"];
  const [tab, setTab] = useState(() => {
    if (typeof window === "undefined") return "overview";
    const t = new URLSearchParams(window.location.search).get("tab");
    return _validTabs.includes(t) ? t : "overview";
  });
  useEffect(() => {
    const t = new URLSearchParams(_dcLoc.search).get("tab");
    if (t && _validTabs.includes(t)) setTab(t);
  }, [_dcLoc.search]);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCoverage = useCallback(async () => {
    setLoading(true);
    try {
      setCoverage(await GrowthService.getCoverage());
    } catch (_) {
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
        <Sidebar />
        <main className="min-w-0 space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Data Center</p>
            <h1 className="font-display mt-1 text-2xl font-bold text-ink sm:text-3xl">Your business data, in one place</h1>
            <p className="mt-1 text-sm text-ink-muted">Import, map, validate and learn from any business file — the Command Center updates automatically.</p>
          </header>

          <div className="flex gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-pill px-4 py-2 text-sm font-semibold transition ${
                  tab === t.id ? "bg-primary text-white shadow-card" : "text-ink-muted hover:bg-bg-subtle hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab coverage={coverage} loading={loading} onGoImport={() => setTab("import")} />}
          {tab === "import" && <ImportTab onComplete={loadCoverage} />}
          {tab === "history" && <HistoryTab />}
          {tab === "coverage" && <CoverageTab coverage={coverage} loading={loading} />}
          {tab === "freshness" && <FreshnessTab />}
          {tab === "dictionary" && <DictionaryTab />}
        </main>
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ coverage, loading, onGoImport }) {
  if (loading) return <LoadingCard />;
  const score = coverage?.coverage_score ?? 0;
  const items = coverage?.items || [];
  const presentKeys = new Set(items.filter((i) => i.present).map((i) => i.key));
  const recommendations = UNLOCKS.filter((u) => !presentKeys.has(u.key));

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Business data coverage</h2>
            <p className="mt-1 text-sm text-ink-muted">How much of your business Copilot can see and analyse.</p>
          </div>
          <ScoreRing score={score} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <CoverageCard key={it.key} label={it.label} present={it.present} unlocks={it.unlocks} />
          ))}
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className="rounded-card border border-primary/20 bg-primary/5 p-6">
          <h3 className="font-display text-base font-semibold text-ink">Unlock more intelligence</h3>
          <ul className="mt-3 space-y-2">
            {recommendations.map((r) => (
              <li key={r.key} className="flex items-start gap-3 rounded-xl bg-surface/60 px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">+</span>
                <p className="min-w-0 text-sm text-ink">
                  <span className="font-semibold">Upload {r.label}</span> to unlock {r.unlocks}.
                </p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onGoImport} className="mt-4 rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            Go to Advanced Import
          </button>
        </section>
      )}
    </div>
  );
}

/* ---------------- Advanced Import ---------------- */
const DATA_TYPES = [
  { id: "sales", label: "Sales Register", hint: "Invoices, orders, revenue" },
  { id: "expense", label: "Expense Register", hint: "Bills, purchases, costs" },
  { id: "gst", label: "GST Reports", hint: "GSTR-1, GSTR-3B exports" },
  { id: "receivables", label: "Outstanding Receivables", hint: "Unpaid invoices, ageing" },
  { id: "inventory", label: "Inventory Reports", hint: "Stock, SKUs, reorder levels" },
  { id: "pnl", label: "Profit & Loss", hint: "Income statement" },
  { id: "balance_sheet", label: "Balance Sheet", hint: "Assets, liabilities, equity" },
  { id: "bank", label: "Bank Statement", hint: "Transactions, balances" },
  { id: "other", label: "Other Business Data", hint: "Any spreadsheet" },
];

function ImportTab({ onComplete }) {
  const [selectedType, setSelectedType] = useState(null);

  return (
    <div className="space-y-6">
      {!selectedType ? (
        <section className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-ink">What are you importing?</h2>
          <p className="mt-1 text-sm text-ink-muted">Pick a type for the best detection — or just upload, Copilot auto-detects either way.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DATA_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t)}
                className="group flex flex-col items-start rounded-card border border-border bg-bg-subtle p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="text-sm font-semibold text-ink group-hover:text-primary">{t.label}</span>
                <span className="mt-1 text-xs text-ink-muted">{t.hint}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Importing</p>
              <h2 className="font-display text-lg font-semibold text-ink">{selectedType.label}</h2>
            </div>
            <button type="button" onClick={() => setSelectedType(null)} className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-bg-subtle">
              Change type
            </button>
          </div>
          <IngestionWizard onComplete={onComplete} />
        </section>
      )}
    </div>
  );
}

/* ---------------- History ---------------- */
function HistoryTab() {
  const { can } = useAccessProfile();
  const canDelete = can("owner");
  const [imports, setImports] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(() => {
    ingestionService.importHistory().then((d) => { setImports(d.imports || []); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    setBusyId(id);
    setNotice(null);
    try {
      await ingestionService.deleteImport(id);
      setNotice({ type: "success", text: "Import deleted. KPIs, health score and insights have been recalculated." });
      load();
    } catch (err) {
      const statusCode = err?.response?.status;
      const detail = err?.response?.data?.detail;
      let text;
      if (statusCode === 403) {
        text = "Only the account owner can delete imported data.";
      } else if (statusCode === 404) {
        text = "This import no longer exists. Refreshing the list.";
        load();
      } else if (detail) {
        text = `Could not delete this import: ${detail}`;
      } else {
        text = "Could not delete this import. Please try again, or restart the app if it persists.";
      }
      setNotice({ type: "error", text });
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded) return <LoadingCard />;
  if (imports.length === 0) {
    return <EmptyCard title="No imports yet" body="Your import history will appear here once you upload your first file." />;
  }

  const statusStyle = (s) =>
    s === "committed" ? "bg-risk-low/10 text-risk-low" : s === "failed" ? "bg-risk-high/10 text-risk-high" : "bg-bg-subtle text-ink-muted";

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-ink">Import history</h2>
      <p className="mt-1 text-sm text-ink-muted">Delete an import to remove its data — everything recalculates automatically.</p>
      {notice && (
        <p className={`mt-3 rounded-xl px-4 py-2 text-sm ${notice.type === "success" ? "bg-risk-low/10 text-risk-low" : "bg-risk-high/10 text-risk-high"}`}>
          {notice.text}
        </p>
      )}
      <div className="mt-4 overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-ink">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-ink">Sheet</th>
              <th className="px-4 py-3 text-left font-semibold text-ink">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-ink">When</th>
              {<th className="px-4 py-3 text-right font-semibold text-ink">Action</th>}
            </tr>
          </thead>
          <tbody>
            {imports.map((b) => (
              <Fragment key={b.id}>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-ink">{b.document_type}</td>
                <td className="px-4 py-3 text-ink-muted">{b.sheet_name || "—"}</td>
                <td className="px-4 py-3">
                  {b.status === "committed" && b.force_imported ? (
                    <span className="rounded-pill bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">⚠ Force Imported</span>
                  ) : b.status === "committed" ? (
                    <span className="rounded-pill bg-risk-low/10 px-2 py-0.5 text-xs font-semibold text-risk-low">✓ Imported</span>
                  ) : (
                    <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${statusStyle(b.status)}`}>{b.status}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{b.created_at ? formatDate(b.created_at) : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {b.impact_report && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                        className="rounded-pill border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        {expandedId === b.id ? "Hide impact" : "View impact"}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        disabled={busyId === b.id}
                        className="rounded-pill border border-risk-high/30 px-3 py-1 text-xs font-semibold text-risk-high transition hover:bg-risk-high/10 disabled:opacity-50"
                      >
                        {busyId === b.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedId === b.id && b.impact_report && (
                <tr className="border-t border-border bg-bg-subtle/30">
                  <td colSpan={5} className="px-4 py-4">
                    <ImportImpactReport impact={b.impact_report} />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- Coverage ---------------- */
function CoverageTab({ coverage, loading }) {
  if (loading) return <LoadingCard />;
  const items = coverage?.items || [];
  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-ink">Data coverage detail</h2>
        <ScoreRing score={coverage?.coverage_score ?? 0} />
      </div>
      <div className="mt-5 space-y-3">
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-4 rounded-card border border-border bg-bg-subtle px-4 py-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${it.present ? "bg-risk-low/15 text-risk-low" : "bg-surface text-ink-muted"}`}>
              {it.present ? "✓" : "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{it.label}</p>
              <p className="truncate text-xs text-ink-muted">Unlocks: {it.unlocks}</p>
            </div>
            <span className={`shrink-0 rounded-pill px-3 py-1 text-xs font-semibold ${it.present ? "bg-risk-low/10 text-risk-low" : "bg-gold/10 text-gold"}`}>
              {it.present ? "Available" : "Missing"}
            </span>
          </div>
        ))}
      </div>
      {coverage?.next_step && (
        <p className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">{coverage.next_step}</p>
      )}
    </section>
  );
}

/* ---------------- Freshness ---------------- */
function FreshnessTab() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import("../services/commandCenterService").then((m) =>
      m.default.getCommandCenter().then((d) => { setData(d.freshness); setLoaded(true); }).catch(() => setLoaded(true))
    );
  }, []);

  if (!loaded) return <LoadingCard />;
  if (!data?.available) {
    return <EmptyCard title="No freshness data yet" body="Once you import data, Copilot tracks how recent it is and reminds you when to refresh." />;
  }

  const status = data.status || "unknown";
  const tone = status === "fresh" ? "risk-low" : status === "due" ? "gold" : "risk-high";
  const TONE = { "risk-low": "text-risk-low bg-risk-low/10", gold: "text-gold bg-gold/10", "risk-high": "text-risk-high bg-risk-high/10" };

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-ink">Data freshness</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className={`rounded-pill px-4 py-2 text-sm font-bold ${TONE[tone]}`}>
          {status === "fresh" ? "Up to date" : status === "due" ? "Refresh soon" : "Out of date"}
        </span>
        {data.days_since != null && (
          <p className="text-sm text-ink-muted">Last updated <span className="font-semibold text-ink">{data.days_since} days</span> ago.</p>
        )}
      </div>
      {data.message && <p className="mt-3 text-sm text-ink-muted">{data.message}</p>}
    </section>
  );
}

/* ---------------- Data Dictionary ---------------- */
function DictionaryTab() {
  const [groups, setGroups] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    ingestionService.fieldRegistry().then((d) => { setGroups(d.groups || {}); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return <LoadingCard />;
  if (!groups) return <EmptyCard title="Dictionary unavailable" body="Could not load the schema library right now." />;

  return (
    <section className="space-y-4">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-ink">Data dictionary</h2>
        <p className="mt-1 text-sm text-ink-muted">The master schema library — every column name Copilot understands, grouped by data type.</p>
      </div>
      {Object.entries(groups).map(([groupName, fields]) => (
        <div key={groupName} className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <button
            type="button"
            onClick={() => setOpen(open === groupName ? null : groupName)}
            className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-bg-subtle"
          >
            <span className="font-display text-base font-semibold text-ink">{groupName}</span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-ink-muted">{fields.length} fields</span>
              <span className={`text-ink-muted transition-transform ${open === groupName ? "rotate-180" : ""}`}>▾</span>
            </span>
          </button>
          {open === groupName && (
            <div className="border-t border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-ink">Field</th>
                      <th className="px-6 py-3 text-left font-semibold text-ink">Required</th>
                      <th className="px-6 py-3 text-left font-semibold text-ink">Recognised names (synonyms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.field} className="border-t border-border align-top">
                        <td className="px-6 py-3">
                          <p className="font-semibold text-ink">{f.label}</p>
                          <p className="text-xs text-ink-muted">{f.description}</p>
                        </td>
                        <td className="px-6 py-3">
                          {f.required ? (
                            <span className="rounded-pill bg-risk-high/10 px-2 py-0.5 text-xs font-semibold text-risk-high">Required</span>
                          ) : (
                            <span className="rounded-pill bg-bg-subtle px-2 py-0.5 text-xs text-ink-muted">Optional</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(f.synonyms || []).slice(0, 12).map((s) => (
                              <span key={s} className="rounded-pill bg-bg-subtle px-2 py-0.5 text-xs text-ink-muted">{s}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/* ---------------- Shared ---------------- */
function ScoreRing({ score = 0 }) {
  const v = Math.max(0, Math.min(100, Math.round(score)));
  const tone = v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444";
  const size = 72, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (v / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 700ms ease" }} />
      </svg>
      <span className="figure absolute inset-0 flex items-center justify-center text-lg font-bold text-ink">{v}</span>
    </div>
  );
}

function CoverageCard({ label, present, unlocks }) {
  return (
    <div className={`min-w-0 rounded-card border p-4 ${present ? "border-risk-low/30 bg-risk-low/5" : "border-border bg-bg-subtle"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">{label}</p>
        <span className={`shrink-0 text-xs font-bold ${present ? "text-risk-low" : "text-ink-muted"}`}>{present ? "✓" : "—"}</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted line-clamp-2">{unlocks}</p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center justify-center rounded-card border border-border bg-surface p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function EmptyCard({ title, body }) {
  return (
    <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

export default DataCenterPage;
