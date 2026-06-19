import { useState } from "react";
import Drawer from "./Drawer";
import ScoreGauge from "../common/charts/ScoreGauge";
import { formatCurrency } from "../../utils/formatters";

function ProductWidget({ data }) {
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
          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Inventory value</p>
            <p className="figure text-lg font-bold text-ink">{formatCurrency(data.inventory_value)}</p>
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
        </div>
      </Drawer>
    </>
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
