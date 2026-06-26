from fastapi import APIRouter
from app.api.api_v1.endpoints import charts
from app.api.api_v1.endpoints import (
    auth,
    health,
    health_score,
    financial_analysis,
    kpis,
    alerts,
    reports,
    recommendations,
    upload,
    ingestion,
    dashboard,
    chat,
    command_center,
    market_radar,
    growth,
    billing,
    executive_summary,
    dashboard_brief,
    monthly_report,
    risk_assessment,
    forecast,
    pdf_report,
    banking_liquidity,
    intelligence_modules,
)
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(
    executive_summary.router,
    prefix="/executive-summary",
    tags=["executive-summary"]
)

api_router.include_router(
    charts.router,
    prefix="/charts",
    tags=["Charts"]
)

api_router.include_router(
    pdf_report.router,
    prefix="/pdf-report",
    tags=["pdf-report"]
)

api_router.include_router(
    forecast.router,
    prefix="/forecast",
    tags=["forecast"]
)

api_router.include_router(
    risk_assessment.router,
    prefix="/risk-assessment",
    tags=["risk-assessment"]
)

api_router.include_router(
    dashboard_brief.router,
    prefix="/dashboard-brief",
    tags=["dashboard-brief"]
)

api_router.include_router(
    monthly_report.router,
    prefix="/monthly-report",
    tags=["monthly-report"]
)

api_router.include_router(
    financial_analysis.router,
    prefix="/financial-analysis",
    tags=["financial-analysis"]
)

api_router.include_router(
    health.router,
    prefix="/health",
    tags=["health"]
)

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"]
)

api_router.include_router(
    upload.router,
    prefix="/upload",
    tags=["upload"]
)

api_router.include_router(
    kpis.router,
    prefix="/kpis",
    tags=["kpis"]
)

api_router.include_router(
    health_score.router,
    prefix="/health-score",
    tags=["health-score"]
)

api_router.include_router(
    alerts.router,
    prefix="/alerts",
    tags=["alerts"]
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["reports"]
)

api_router.include_router(
    recommendations.router,
    prefix="/recommendations",
    tags=["recommendations"]
)

api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"]
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["chat"]
)

if settings.command_center_enabled:
    api_router.include_router(
        command_center.router,
        prefix="/command-center",
        tags=["command-center"]
    )

if settings.market_radar_enabled:
    api_router.include_router(
        market_radar.router,
        prefix="/market-radar",
        tags=["market-radar"]
    )

api_router.include_router(
    growth.router,
    prefix="/growth",
    tags=["growth"]
)

api_router.include_router(
    billing.router,
    prefix="/billing",
    tags=["billing"]
)

api_router.include_router(
    banking_liquidity.router,
    prefix="/banking-liquidity",
    tags=["banking-liquidity"]
)

api_router.include_router(
    intelligence_modules.router,
    prefix="/intelligence",
    tags=["intelligence"]
)

# Additive, parallel to /upload/ -- not a replacement. Gated behind a
# flag so it can be disabled with a config change, never a deploy.
# See PRODUCTION_ARCHITECTURE_REVIEW.md section 7.
if settings.ingestion_engine_enabled:
    api_router.include_router(
        ingestion.router,
        prefix="/ingestion",
        tags=["ingestion"]
    )