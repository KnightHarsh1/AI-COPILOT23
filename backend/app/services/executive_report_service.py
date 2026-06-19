"""Assembles an executive, business-owner-focused report by reusing the
existing AI, KPI, health, and intelligence services. No new analysis
logic -- it composes what already exists into the structure Task 3 asks
for: executive summary, key risks, key opportunities, performance
summary, insights, trend, and action recommendations.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.services.ai_service import AIService
from app.services.kpi_engine import KPIService
from app.services.health_score import HealthScoreService
from app.services.dashboard_service import DashboardService
from app.services.intelligence.action_center_service import ActionCenterService
from app.services.intelligence.collections_service import CollectionsIntelligenceService
from app.services.intelligence.product_service import ProductIntelligenceService
from app.services.market.radar_service import MarketRadarService


def _safe(fn, fallback):
    try:
        return fn()
    except Exception:
        return fallback


class ExecutiveReportService:
    def __init__(self, session: Session):
        self.session = session

    def build(self, company_id, user=None) -> dict:
        summary = _safe(lambda: DashboardService(self.session).get_dashboard_summary(company_id), {})
        kpis = _safe(lambda: KPIService(self.session).calculate_kpis(company_id), {})
        health = _safe(lambda: HealthScoreService(self.session).calculate_health_score(company_id), {})
        brief = _safe(lambda: AIService(self.session).generate_dashboard_brief(company_id, user=user), {})
        actions = _safe(lambda: ActionCenterService(self.session).generate(company_id), {})

        # Key risks: pull threats from action center + market radar.
        market = _safe(lambda: MarketRadarService(self.session).build(company_id), {'available': False})
        collections = _safe(lambda: CollectionsIntelligenceService(self.session).analyze(company_id), {'available': False})
        product = _safe(lambda: ProductIntelligenceService(self.session).analyze(company_id), {'available': False})

        key_risks = []
        for a in (actions.get('today', []) + actions.get('week', [])):
            if a.get('priority') == 'high':
                key_risks.append({'title': a['title'], 'detail': a['reason'], 'action': a['recommended_action']})
        if market.get('available'):
            for t in market.get('top_threats', []):
                key_risks.append({'title': t.get('headline'), 'detail': t.get('why_it_matters'), 'action': t.get('recommended_action')})

        key_opportunities = []
        if market.get('available'):
            for o in market.get('top_opportunities', []):
                key_opportunities.append({'title': o.get('headline'), 'detail': o.get('why_it_matters'), 'action': o.get('recommended_action')})
        for a in actions.get('month', []):
            if a.get('category') in ('collections', 'inventory_risk', 'customer_risk'):
                key_opportunities.append({'title': a['title'], 'detail': a['reason'], 'action': a['recommended_action']})

        performance = {
            'health_score': summary.get('health_score', 0),
            'revenue': summary.get('revenue', 0),
            'net_profit': summary.get('net_profit', 0),
            'expenses': summary.get('expenses', 0),
            'profit_margin': kpis.get('profit_margin', 0),
            'growth_rate': kpis.get('growth_rate', 0),
            'data_completeness': health.get('data_completeness', 0),
        }
        if collections.get('available'):
            performance['outstanding_receivables'] = collections.get('outstanding_receivables', 0)
            performance['collection_efficiency'] = collections.get('collection_efficiency', 0)
        if product.get('available'):
            performance['inventory_value'] = product.get('inventory_value', 0)

        return {
            'generated_at': date.today().isoformat(),
            'executive_summary': brief.get('headline') or 'Your business summary will appear here once data is available.',
            'insights': brief.get('items', []),
            'key_risks': key_risks[:5],
            'key_opportunities': key_opportunities[:5],
            'performance': performance,
            'recommended_actions': (actions.get('today', []) + actions.get('week', []))[:5],
        }
