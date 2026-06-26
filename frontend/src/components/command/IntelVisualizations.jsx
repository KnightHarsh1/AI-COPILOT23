// Intelligence visualizations — pure SVG, no external chart dependency, driven
// entirely by backend payloads. Each renders nothing when its data is absent
// (no fabricated values). Used inside ModuleIntelligenceCard and the legacy
// cards. Colours use the theme CSS variables via inline rgb(var(--…)).

const C = {
  primary: "rgb(var(--c-primary))",
  low: "rgb(var(--c-risk-low, 34 197 94))",
  high: "rgb(var(--c-risk-high, 239 68 68))",
  gold: "rgb(var(--c-gold, 245 158 11))",
  ink: "rgb(var(--c-ink))",
  muted: "rgb(var(--c-ink-muted))",
  border: "rgb(var(--c-border))",
  subtle: "rgb(var(--c-bg-subtle, 248 250 252))",
};

function compact(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function Title({ children }) {
  return <h4 className="font-display mb-3 text-base font-bold text-ink">{children}</h4>;
}
function Card({ children }) {
  return <div className="rounded-card border border-border bg-surface p-6 shadow-card">{children}</div>;
}

// 1) Margin Waterfall — revenue → −COGS → −opex → net profit.
export function MarginWaterfall({ revenue, grossProfit, operatingProfit, netProfit }) {
  if (revenue == null || netProfit == null) return null;
  const cogs = grossProfit != null ? revenue - grossProfit : null;
  const opex = grossProfit != null && operatingProfit != null ? grossProfit - operatingProfit : null;
  const other = operatingProfit != null ? operatingProfit - netProfit : (grossProfit != null ? grossProfit - netProfit : revenue - netProfit);
  const steps = [{ label: "Revenue", val: revenue, type: "total" }];
  if (cogs != null) steps.push({ label: "COGS", val: -cogs, type: "neg" });
  if (opex != null) steps.push({ label: "Opex", val: -opex, type: "neg" });
  if (other != null && Math.abs(other) > 0) steps.push({ label: "Other", val: -other, type: "neg" });
  steps.push({ label: "Net profit", val: netProfit, type: "total" });

  const w = 520, h = 220, pad = 30, bw = 46;
  const max = Math.max(revenue, 1);
  const scale = (h - pad * 2) / max;
  const gap = (w - pad * 2 - bw) / (steps.length - 1);
  let running = 0;
  const bars = steps.map((s, i) => {
    const x = pad + i * gap;
    let y, height, fill;
    if (s.type === "total") {
      height = Math.abs(s.val) * scale; y = h - pad - height;
      fill = i === 0 ? C.primary : (s.val >= 0 ? C.low : C.high);
      running = s.val;
    } else {
      const start = running; running += s.val;
      const top = Math.max(start, running); const bottom = Math.min(start, running);
      y = h - pad - top * scale; height = (top - bottom) * scale; fill = C.high;
    }
    return { x, y, height: Math.max(1, height), fill, label: s.label, val: s.val };
  });
  return (
    <Card>
      <Title>Margin waterfall</Title>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 240 }}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.border} />
        {bars.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={bw} height={b.height} rx="3" fill={b.fill} opacity="0.9" />
            <text x={b.x + bw / 2} y={b.y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.ink}>{compact(b.val)}</text>
            <text x={b.x + bw / 2} y={h - pad + 16} textAnchor="middle" fontSize="10" fill={C.muted}>{b.label}</text>
          </g>
        ))}
      </svg>
    </Card>
  );
}

// 2) Inventory Risk Meter — gauge of dead+slow+stockout vs total inventory value.
export function InventoryRiskMeter({ inventoryValue, deadValue, slowValue, stockoutValue }) {
  if (inventoryValue == null || inventoryValue <= 0) return null;
  const atRisk = (deadValue || 0) + (slowValue || 0) + (stockoutValue || 0);
  const pct = Math.min(100, Math.round((atRisk / inventoryValue) * 100));
  const angle = (pct / 100) * 180;
  const r = 90, cx = 110, cy = 110;
  const rad = (deg) => (deg - 180) * (Math.PI / 180);
  const x = cx + r * Math.cos(rad(angle)), y = cy + r * Math.sin(rad(angle));
  const tone = pct >= 50 ? C.high : pct >= 25 ? C.gold : C.low;
  return (
    <Card>
      <Title>Inventory risk meter</Title>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 220 130" className="w-56">
          <path d={`M 20 110 A 90 90 0 0 1 200 110`} fill="none" stroke={C.border} strokeWidth="16" strokeLinecap="round" />
          <path d={`M 20 110 A 90 90 0 0 1 ${x} ${y}`} fill="none" stroke={tone} strokeWidth="16" strokeLinecap="round" />
          <text x="110" y="95" textAnchor="middle" fontSize="30" fontWeight="800" fill={C.ink}>{pct}%</text>
          <text x="110" y="118" textAnchor="middle" fontSize="11" fill={C.muted}>capital at risk</text>
        </svg>
        <div className="space-y-1 text-sm">
          <p className="text-ink-muted">Dead: <span className="font-semibold text-ink">{compact(deadValue || 0)}</span></p>
          <p className="text-ink-muted">Slow: <span className="font-semibold text-ink">{compact(slowValue || 0)}</span></p>
          <p className="text-ink-muted">Stockout: <span className="font-semibold text-ink">{compact(stockoutValue || 0)}</span></p>
        </div>
      </div>
    </Card>
  );
}

// 3) Inventory ABC Quadrant — count + value per class A/B/C.
export function InventoryABCQuadrant({ abc }) {
  if (!abc) return null;
  const classes = ["A", "B", "C"];
  const maxVal = Math.max(...classes.map((g) => abc[g]?.value || 0), 1);
  const tones = { A: C.low, B: C.gold, C: C.high };
  return (
    <Card>
      <Title>ABC analysis</Title>
      <div className="space-y-3">
        {classes.map((g) => {
          const val = abc[g]?.value || 0, count = abc[g]?.count || 0;
          return (
            <div key={g} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm font-semibold text-ink">Class {g}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-bg-subtle">
                <div className="flex h-full items-center justify-end rounded-lg px-2 text-[11px] font-bold text-white" style={{ width: `${Math.max(8, (val / maxVal) * 100)}%`, background: tones[g] }}>{compact(val)}</div>
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-ink-muted">{count} items</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// 4) RFM Scatter — segments plotted by recency (x) × frequency (y), bubble=count.
export function RFMScatter({ rfm }) {
  if (!rfm) return null;
  // Fixed segment coordinates (recency low→high left→right, frequency high→low top→bottom).
  const pts = [
    { seg: "Champions", x: 0.2, y: 0.2, c: C.low },
    { seg: "Loyal", x: 0.35, y: 0.45, c: C.primary },
    { seg: "Growing", x: 0.5, y: 0.3, c: C.gold },
    { seg: "At Risk", x: 0.7, y: 0.6, c: C.gold },
    { seg: "Lost", x: 0.85, y: 0.85, c: C.high },
  ].map((p) => ({ ...p, n: rfm[p.seg] || 0 }));
  const total = pts.reduce((a, p) => a + p.n, 0) || 1;
  const w = 360, h = 240, pad = 30;
  return (
    <Card>
      <Title>RFM segments</Title>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 260 }}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.border} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={C.border} />
        <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="10" fill={C.muted}>← recent     stale →</text>
        <text x={12} y={h / 2} textAnchor="middle" fontSize="10" fill={C.muted} transform={`rotate(-90 12 ${h / 2})`}>← frequent</text>
        {pts.map((p, i) => {
          const cx = pad + p.x * (w - pad * 2), cy = pad + p.y * (h - pad * 2);
          const rad = 8 + (p.n / total) * 34;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={rad} fill={p.c} opacity="0.35" />
              <circle cx={cx} cy={cy} r="3" fill={p.c} />
              <text x={cx} y={cy - rad - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.ink}>{p.seg} ({p.n})</text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

// 5) Risk Heatmap — each risk category as a coloured cell by severity.
export function RiskHeatmap({ breakdown }) {
  if (!breakdown || breakdown.length === 0) return null;
  const tone = (r) => (r >= 60 ? C.high : r >= 35 ? C.gold : C.low);
  return (
    <Card>
      <Title>Risk heatmap</Title>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {breakdown.map((b) => (
          <div key={b.label} className="rounded-xl p-3 text-center" style={{ background: tone(b.risk), opacity: 0.9 }}>
            <p className="text-[11px] font-semibold text-white">{b.label}</p>
            <p className="figure-value text-lg font-bold text-white">{Math.round(b.risk)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// 6) Forecast Trend Chart + 7) Confidence Band — combined: history line + next
// point with best/worst band.
export function ForecastTrendChart({ history, scenarios }) {
  if (!history || (!history.revenue && !history.expenses)) return null;
  const rev = history.revenue || [];
  const exp = history.expenses || [];
  const next = scenarios?.revenue || null;
  const series = [...rev];
  if (next) series.push(next.expected);
  const all = [...rev, ...exp, ...(next ? [next.best, next.worst] : [])].filter((v) => v != null);
  const max = Math.max(...all, 1), min = Math.min(...all, 0);
  const w = 520, h = 220, pad = 36;
  const span = max - min || 1;
  const xAt = (i, n) => pad + (i / Math.max(1, n - 1)) * (w - pad * 2);
  const yAt = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i, series.length)} ${yAt(v)}`).join(" ");

  let band = null;
  if (next) {
    const lastI = rev.length - 1, nextI = rev.length;
    const bx = xAt(nextI, series.length);
    band = { x: bx, top: yAt(next.best), bot: yAt(next.worst), exp: yAt(next.expected), lx: xAt(lastI, series.length), ly: yAt(rev[lastI]) };
  }
  return (
    <Card>
      <Title>Forecast trend &amp; confidence band</Title>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 240 }}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.border} />
        {/* confidence band */}
        {band && (
          <>
            <line x1={band.x} y1={band.top} x2={band.x} y2={band.bot} stroke={C.primary} strokeWidth="14" strokeLinecap="round" opacity="0.18" />
            <line x1={band.lx} y1={band.ly} x2={band.x} y2={band.exp} stroke={C.primary} strokeWidth="2.5" strokeDasharray="5 4" />
            <circle cx={band.x} cy={band.exp} r="4" fill={C.primary} />
            <circle cx={band.x} cy={band.top} r="2.5" fill={C.low} />
            <circle cx={band.x} cy={band.bot} r="2.5" fill={C.high} />
          </>
        )}
        <path d={line(rev)} fill="none" stroke={C.primary} strokeWidth="2.5" />
        {exp.length > 0 && <path d={line(exp)} fill="none" stroke={C.muted} strokeWidth="1.5" strokeDasharray="3 3" />}
        <text x={pad} y={pad - 10} fontSize="10" fill={C.muted}>Revenue (solid) · Expenses (dotted) · Forecast ◆</text>
      </svg>
    </Card>
  );
}

export default {
  MarginWaterfall, InventoryRiskMeter, InventoryABCQuadrant, RFMScatter, RiskHeatmap, ForecastTrendChart,
};
