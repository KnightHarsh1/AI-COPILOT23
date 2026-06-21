import { useEffect, useState } from "react";
import ChartService from "../../../services/chartService";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { CHART_COLORS, axisTickStyle } from "./chartTheme";
import { formatCurrency } from "../../../utils/formatters";

function compact(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
}

// Linear least-squares projection over the real revenue series. We never
// invent figures — the projection is an honest trend extension of the
// company's own history and is visually separated (dashed) and labeled.
function project(series, periods = 3) {
  if (series.length < 2) return [];
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((d) => d.value);
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, b) => a + b * b, 0);
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const intercept = (sy - slope * sx) / n;
  const out = [];
  for (let i = 0; i < periods; i++) {
    const x = n + i;
    out.push({ label: `+${i + 1}`, projected: Math.max(0, Math.round(intercept + slope * x)) });
  }
  return out;
}

function ForecastChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChartService.getRevenueChart()
      .then((rev) => {
        const hist = (rev || []).map((d) => ({ label: d.label, value: Number(d.value ?? 0) }));
        const proj = project(hist);
        const merged = [
          ...hist.map((d) => ({ label: d.label, actual: d.value })),
          ...proj.map((d) => ({ label: d.label, projected: d.projected })),
        ];
        // bridge: last actual also seeds the projection line for continuity
        if (hist.length && proj.length) {
          merged[hist.length - 1].projected = hist[hist.length - 1].value;
        }
        setData(merged);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data.length === 0) {
    return <p className="text-sm text-ink-muted">No revenue history yet — upload sales data to see a forecast.</p>;
  }
  const hasProjection = data.some((d) => d.projected != null && d.actual == null);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-ink">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.primary }} />Actual revenue</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.riskLow }} />Projected</span>
      </div>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="fc-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={{ stroke: CHART_COLORS.border }} padding={{ left: 12, right: 12 }} />
            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={compact} width={56} />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: 12, color: CHART_COLORS.ink }} />
            <Area type="monotone" dataKey="actual" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#fc-actual)" dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="projected" stroke={CHART_COLORS.riskLow} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hasProjection && (
        <p className="mt-2 text-center text-xs text-ink-muted">Projection is a trend estimate from your own revenue history, not a guarantee.</p>
      )}
    </div>
  );
}

export default ForecastChart;
