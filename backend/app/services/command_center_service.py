"""Business Command Center aggregator.

The single service the /command-center endpoint calls. Assembles every
dashboard section into one response, calling each engine independently so
that a failure or "no data" state in one section never breaks the others.
Each section is wrapped in its own try/except — a half-populated dashboard
is far more useful to an SME owner than a 500.

Reuses (never modifies) the existing KPI, Health, Dashboard, and AI
services. The three intelligence engines and the action center are new.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.services.kpi_engine import KPIService
from app.services.health_score import HealthScoreService
from app.services.dashboard_service import DashboardService
from app.services.ai_service import AIService
from app.services.intelligence.action_center_service import ActionCenterService
from app.services.intelligence.collections_service import CollectionsIntelligenceService
from app.services.intelligence.product_service import ProductIntelligenceService
from app.services.intelligence.compliance_service import ComplianceIntelligenceService
from app.services.market.radar_service import MarketRadarService
from app.services.upload_freshness_service import UploadFreshnessService


def _safe(fn, fallback):
    try:
        return fn()
    except Exception:
        return fallback


class CommandCenterService:
    def __init__(self, session: Session):
        self.session = session

    def build(self, company_id, user=None) -> dict:
        dashboard = DashboardService(self.session)
        kpi_service = KPIService(self.session)
        health_service = HealthScoreService(self.session)

        summary = _safe(lambda: dashboard.get_dashboard_summary(company_id), {})
        kpis = _safe(lambda: kpi_service.calculate_kpis(company_id), {})
        health = _safe(lambda: health_service.calculate_health_score(company_id), {})

        # Section 1 — Business Health
        health_section = {
            'health_score': summary.get('health_score', 0),
            'data_completeness': health.get('data_completeness', 0),
            'components': {
                'revenue_growth_score': health.get('revenue_growth_score', 0),
                'profitability_score': health.get('profitability_score', 0),
                'inventory_health_score': health.get('inventory_health_score', 0),
                'customer_risk_score': health.get('customer_risk_score', 0),
                'liquidity_solvency_score': health.get('liquidity_solvency_score'),
            },
            'components_unavailable': health.get('components_unavailable', []),
            'revenue': summary.get('revenue', 0),
            'net_profit': summary.get('net_profit', 0),
            'expenses': summary.get('expenses', 0),
            'growth_rate': kpis.get('growth_rate', 0),
            'profit_margin': kpis.get('profit_margin', 0),
        }

        # Section 2 — Daily AI Action Center
        action_center = _safe(
            lambda: ActionCenterService(self.session).generate(company_id),
            {'today': [], 'week': [], 'month': [], 'total_actions': 0},
        )

        # Section 3 — AI Insights (reuses existing brief)
        insights = _safe(
            lambda: AIService(self.session).generate_dashboard_brief(company_id, user=user),
            {'headline': '', 'items': []},
        )

        # Section 4 — Compliance Intelligence
        compliance = _safe(
            lambda: ComplianceIntelligenceService(self.session).analyze(company_id),
            {'available': False, 'reason': 'Compliance data could not be loaded.'},
        )

        # Section 5 — Collections Intelligence
        collections = _safe(
            lambda: CollectionsIntelligenceService(self.session).analyze(company_id),
            {'available': False, 'reason': 'Collections data could not be loaded.'},
        )

        # Section 6 — Product Intelligence
        product = _safe(
            lambda: ProductIntelligenceService(self.session).analyze(company_id),
            {'available': False, 'reason': 'Product data could not be loaded.'},
        )

        # Section 7 — Market Intelligence Radar
        market = _safe(
            lambda: MarketRadarService(self.session).build(company_id),
            {'available': False, 'reason': 'Market radar could not be loaded.'},
        )

        # Upload freshness banner
        freshness = _safe(
            lambda: UploadFreshnessService(self.session).status(company_id),
            {'available': False},
        )

        # Outstanding receivables surfaced into the health strip if available.
        if collections.get('available'):
            health_section['outstanding_receivables'] = collections.get('outstanding_receivables', 0)
            health_section['cash_position'] = collections.get('total_collected', 0)

        return {
            'health': health_section,
            'action_center': action_center,
            'insights': insights,
            'compliance': compliance,
            'collections': collections,
            'product': product,
            'market': market,
            'freshness': freshness,
            'generated_at': date.today().isoformat(),
        }
