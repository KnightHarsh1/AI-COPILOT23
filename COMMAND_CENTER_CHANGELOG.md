# Business Command Center — Build Changelog

This build adds the Business Command Center on top of the existing app
(KPIs, Health Score, Reports, Forecasting, AI Chat, PDF, Auth, Upload,
and the Universal Ingestion Engine are all untouched and still work).

## What's new

### New post-login home: the Command Center
`/app/dashboard` is now the Business Command Center. The previous
dashboard is preserved at `/app/dashboard-classic`. It answers the five
questions in one scannable page: what's happening, what to do today,
what's risky, why, and what's next.

Sections, top to bottom:
1. **Business Health** — master radial gauge + component breakdown bars +
   Revenue / Profit / Receivables / Expenses.
2. **Daily AI Action Center** — prioritized actions in Today / Week /
   Month tabs, each an expandable card with reason, expected impact, and
   recommended action.
3. **Intelligence widgets** — Collections, Product, Compliance as compact
   score cards that open slide-in **drawers** for detail (no new pages).
4. **AI Insights** — what/why/do narrative cards.
5. **Charts** — see below.

### Charts: fixed and upgraded
- **Expense breakdown** previously grouped by *month* (wrong for a pie);
  now correctly groups by **expense category** as a modern donut with
  percentage tooltips.
- **Health trend** was a fake `revenue ÷ 10000` proxy; now plots the
  **real persisted health-score history** from the metrics table as a
  gradient area chart.
- **New combined chart**: Revenue / Expenses / Profit together
  (bars + profit line) — far clearer than three separate charts.
- Month labels are now readable ("Mar 26" not "03").
- New reusable **radial score gauge** used across all health/score cards.

### Three intelligence engines (deterministic, AI-optional)
- **Collections** — cash vs credit, outstanding receivables, aging
  buckets, collection efficiency, customer-dependency, credit health score.
- **Product** — best sellers, dead/slow stock, stockout risk, product
  dependency, product health score.
- **Compliance** — auto-generated GST/TDS/ITR deadline calendar from
  standard Indian filing rules, compliance score, overdue/due-soon counts.

### Honest data handling
Where data isn't captured yet, widgets say so instead of showing
zeros — e.g. "N sales missing payment data, re-import to unlock", or a
"Add GSTIN" setup prompt for compliance. This was the key caveat from the
architecture review and it's built in.

## Database changes (additive only)
- **Migration 0008** — sales gains `due_date`, `payment_status`,
  `amount_paid`, `is_credit_sale`, `paid_date`, `inventory_item_id`;
  inventory_items gains `last_sold_date`, `total_units_sold`.
- **Migration 0009** — companies gains `gstin`, `pan`,
  `gst_filing_frequency`, `compliance_enabled`; new `compliance_deadlines`
  table.

No existing column is altered or dropped. Existing rows get safe defaults
(e.g. `payment_status='unknown'`).

## How to run
- Fresh DB: `create_all` picks everything up.
- Existing DB: `alembic upgrade head` (runs 0008 then 0009).
- Disable without a deploy: `COMMAND_CENTER_ENABLED=false` in `.env`
  (the classic dashboard remains at `/app/dashboard-classic`).

## Capturing the new data
Route sales with due-date / payment-status / paid-amount columns through
the existing **Import** (ingestion) flow — the column-mapping dictionary
was extended so these map automatically. Add your GSTIN via the
"Add GSTIN" prompt on the Compliance widget to generate the filing calendar.

## What was NOT touched
KPI engine, Health Score engine internals, Alerts, Recommendations,
Reports, Forecasting, AI Chat, PDF export, Authentication, Upload, and the
Ingestion Engine. The Command Center is a new parallel surface; the old
`/dashboard/summary` endpoint and classic dashboard still work.
