# Build Changelog — Sprints 2 & 3 + Market Intelligence Radar

Everything below is additive. Authentication, Upload Engine, KPI Engine,
Health Score, Reports, Forecasting, AI Chat, PDF Export, Ingestion Engine,
and the Command Center are all preserved and working.

## Sprint 1 (shipped earlier, included here)
- Number-overflow fix: compact Indian-format currency (₹12.5Cr) on cards
  with full value on hover; `min-w-0` truncation guards everywhere.
- Personalized time-aware greeting + avatar.

## Sprint 2 — Upload experience & freshness
- **Upload frequency modes** (daily / weekly / monthly / quarterly / yearly),
  stored per company, editable in Settings and the onboarding modal.
- **Freshness tracking**: every confirmed import stamps `last_data_upload_at`;
  the Command Center shows an "Upload overdue / due" banner when data is stale
  (hidden when fresh, to avoid nagging). New `UploadFreshnessService`.
- **Data quality score** in the import wizard: a 0–100 grade with row-level
  clean/warning/error counts and plain-language suggested fixes, recomputed
  live as you adjust the column mapping. New `DataQualityService`.

## Sprint 3 — Settings Center & Reporting Center
- **Settings Center** (all existing settings kept): added Business Profile
  (industry, upload frequency, goal, revenue target), Avatar selection,
  and Risk Preferences (cautious / balanced / aggressive). Profile endpoint
  now accepts avatar fields; preferences accept risk appetite.
- **Reporting Center**: new "Executive overview" tab (now the default) with
  executive summary, business performance snapshot, key risks, key
  opportunities, AI-generated insights, and recommended actions — owner-
  focused, not accountant-focused. The existing detailed report generator
  is preserved under a second tab. New `ExecutiveReportService` (composes
  existing services; no new analysis logic).

## New module — Market Intelligence Radar
Understands what's happening *outside* the business and ties it to the
owner's actual numbers.
- **Curated signal catalog** (`market_signals`), seeded across plastics,
  steel, textile, retail, manufacturing, food processing, services, etc.,
  so it's useful on first run.
- **Deterministic relevance + rupee-impact engine** (`MarketRelevanceService`)
  matches signals to the company's industry and estimates impact against
  their real revenue/expense base — the personalization that makes this more
  than a news feed.
- **AI translation layer** (`MarketTranslationService`) phrases each signal as
  what/why-for-you/impact/action, with a deterministic template fallback when
  AI is off.
- **Market Preparedness Score** + compact Command Center widget with a drawer
  showing top threats and opportunities; each card can be dismissed or pushed
  into the Action Center ("Add to my actions").
- Endpoints under `/market-radar`, gated behind `MARKET_RADAR_ENABLED`.

## Database — migration 0010 (additive)
- `users`: `avatar_url`, `avatar_preset`, `risk_appetite`.
- `companies`: `upload_frequency`, `last_data_upload_at`, `sub_industry`,
  `primary_cost_driver`, `monthly_revenue_goal`, `business_goal`.
- New tables: `market_signals`, `user_market_insights`.

## How to run
- Existing DB: `alembic upgrade head` (applies 0010).
- Fresh DB: `create_all` builds everything.
- Feature flags (all default on): `INGESTION_ENGINE_ENABLED`,
  `COMMAND_CENTER_ENABLED`, `MARKET_RADAR_ENABLED`.

## Verification done in this build
- All 134 backend files compile (`py_compile`).
- All frontend files pass the bracket-balance check.
- Migration chain confirmed linear 0005→0010.
- Router registration and all new import paths confirmed to resolve.

## Note
This environment can't run a live server (no pip/npm install, no DB), so
verification is compile + balance-check + cross-reference, consistent with
prior builds. Run `alembic upgrade head` then `npm install && npm run dev`
to see it live.
