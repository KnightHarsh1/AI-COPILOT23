// Sparkline — a tiny inline trend chart for KPI cards. Raw SVG (no chart lib)
// so it renders everywhere and stays crisp. If real series data is passed it's
// used; otherwise a gentle deterministic curve is derived from the value+seed so
// every card shows a stable, non-random line. Decorative trend cue only.
function makeSeries(seed = 1, up = true) {
  // Deterministic pseudo-curve from a seed so it doesn't change every render.
  const pts = [];
  let v = 50;
  for (let i = 0; i < 12; i++) {
    const wobble = Math.sin((i + seed) * 0.9) * 8 + Math.cos((i + seed) * 0.5) * 5;
    const drift = up ? i * 2.4 : -i * 1.6;
    v = 50 + drift + wobble;
    pts.push(v);
  }
  return pts;
}

function Sparkline({ data, color = "rgb(var(--c-primary))", up = true, seed = 1, width = 96, height = 36 }) {
  const series = Array.isArray(data) && data.length > 1 ? data : makeSeries(seed, up);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1);

  const points = series.map((val, i) => {
    const x = i * stepX;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const gradId = `spark-${seed}-${up ? "u" : "d"}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

export default Sparkline;
