import { useState } from "react";
import Drawer from "./Drawer";
import ScoreGauge from "../common/charts/ScoreGauge";
import { formatCurrency, formatCurrencyCompact } from "../../utils/formatters";
import { ExplainTooltip } from "../common/ExplainTooltip";
import TrustFooter from "./TrustFooter";
import HealthImpactBadge from "./HealthImpactBadge";
import { InventoryRiskMeter, InventoryABCQuadrant } from "./IntelVisualizations";

function ProductWidget({ data, healthImpact }) {
  const [open, setOpen] = useState(false);

  if (!data?.available) {
    return (
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="text-base font-semibold text-ink">Products</span>
        <p className="mt-3 text-sm text-ink-muted">{data?.reason || "No product data yet."}</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full flex-col rounded-card border border-border bg-surface p-5 text-left shadow-card transition hover:shadow-card-hover"
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-ink">Products</span>
          <span className="text-xs font-semibold text-primary">Details →</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <ScoreGauge score={data.product_health_score} size={96} label="Product health" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-ink-muted">Inventory value</p>
            <p className="figure truncate text-lg font-bold text-ink" title={formatCurrency(data.inventory_value)}>
              {formatCurrencyCompact(data.inventory_value)}
            </p>
            <p className="text-xs text-ink-muted">
              {data.stockout_risk?.length || 0} low-stock · {data.dead_stock?.length || 0} dead
            </p>
          </div>
        </div>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Product Intelligence"
        subtitle="What's selling, what's stuck, and what's running out."
      >
        <div className="space-y-6">
          {data.coverage_note && (
            <p className="rounded-xl border border-border bg-bg-subtle px-4 py-2 text-xs text-ink-muted">
              {data.coverage_note}
            </p>
          )}

          {/* New inventory KPIs with explain-this-number */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PStat label="Turnover ratio" value={data.inventory_turnover_ratio != null ? `${data.inventory_turnover_ratio}×` : "—"}
              explain={{ title: "Inventory Turnover", hint: "How many times stock sells through per year.", detail: { formula: "(COGS × 4) / inventory value", sources: ["Inventory", "Sales"], confidence: 60 } }} />
            <PStat label="DIO" value={data.dio != null ? `${data.dio} days` : "—"}
              explain={{ title: "Days Inventory Outstanding", hint: "Average days stock sits before selling.", detail: { formula: "365 / turnover ratio", sources: ["Inventory", "Sales"], confidence: 60 } }} />
            <PStat label="Dead stock" value={formatCurrency(data.dead_stock_value || 0)}
              explain={{ title: "Dead Stock Value", hint: "Capital tied up in unsold stock (90+ days idle).", detail: { formula: "Σ unit cost × qty for idle ≥90d", sources: ["Inventory"], confidence: 75 } }} />
            <PStat label="Slow moving" value={formatCurrency(data.slow_moving_value || 0)}
              explain={{ title: "Slow-moving Value", hint: "Stock idle 30–90 days.", detail: { formula: "Σ unit cost × qty for idle 30–90d", sources: ["Inventory"], confidence: 70 } }} />
            <PStat label="Overstock" value={formatCurrency(data.overstock_value || 0)}
              explain={{ title: "Overstock Value", hint: "Stock far above reorder level (≥3×).", detail: { formula: "Σ unit cost × qty where qty ≥ 3× reorder", sources: ["Inventory"], confidence: 65 } }} />
            <PStat label="Stockout risk" value={formatCurrency(data.stockout_risk_value || 0)}
              explain={{ title: "Stockout Risk Value", hint: "Units at/below reorder level.", detail: { formula: "Σ qty where qty ≤ reorder level", sources: ["Inventory"], confidence: 70 } }} />
          </div>

          {/* Inventory risk meter */}
          <InventoryRiskMeter inventoryValue={data.inventory_value} deadValue={data.dead_stock_value} slowValue={data.slow_moving_value} stockoutValue={data.stockout_risk_value} />

          {/* ABC analysis quadrant */}
          {data.abc_analysis && <InventoryABCQuadrant abc={data.abc_analysis} />}

          <ListBlock
            title="Best sellers"
            items={data.best_sellers}
            empty="No linked sales yet — link sales to products to populate this."
            render={(p) => (
              <>
                <span className="text-ink">{p.product_name}</span>
                <span className="figure font-semibold text-ink">{formatCurrency(p.revenue)}</span>
              </>
            )}
          />

          <ListBlock
            title="Stockout risk"
            items={data.stockout_risk}
            empty="No products below their reorder level. Good."
            render={(p) => (
              <>
                <span className="text-ink">{p.product_name}</span>
                <span className="text-xs font-semibold text-risk-high">
                  {p.quantity} left (reorder at {p.reorder_level})
                </span>
              </>
            )}
          />

          <ListBlock
            title={`Dead stock · ${formatCurrency(data.dead_stock_value)}`}
            items={data.dead_stock}
            empty="No dead stock detected."
            render={(p) => (
              <>
                <span className="text-ink">{p.product_name}</span>
                <span className="text-xs text-ink-muted">
                  {p.days_idle == null ? "never sold" : `${p.days_idle}d idle`} · {formatCurrency(p.value)}
                </span>
              </>
            )}
          />

          {data.top_product_share > 50 && (
            <div className="rounded-xl border border-risk-medium/20 bg-risk-medium/5 p-4 text-sm text-risk-medium">
              Your top product is {data.top_product_share}% of linked revenue — consider broadening the range.
            </div>
          )}

          <HealthImpactBadge points={healthImpact} />
          <TrustFooter
            sources={["Inventory Register", "Sales Register"]}
            confidence={Math.round(data.product_health_score || 0) >= 70 ? 78 : 60}
            lastUpdated={data.last_updated || "Latest import"}
            explanation="Inventory KPIs (turnover, DIO, ABC, dead/slow/overstock) are computed from your stock register and linked sales."
            assumptions={data.coverage_note || undefined}
            warning={data.dead_stock_value > 0 ? `${formatCurrency(data.dead_stock_value)} trapped in dead stock` : undefined}
          />
        </div>
      </Drawer>
    </>
  );
}

function PStat({ label, value, explain }) {
  return (
    <div className="min-w-0 rounded-lg bg-bg-subtle px-3 py-2">
      <p className="flex items-center gap-1 truncate text-xs text-ink-muted">{label}
        {explain && <ExplainTooltip title={explain.title || label} hint={explain.hint} detail={explain.detail} />}
      </p>
      <p className="figure mt-0.5 break-words font-semibold text-ink">{value}</p>
    </div>
  );
}

function ListBlock({ title, items, empty, render }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      {!items || items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2 text-sm">
              {render(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductWidget;
