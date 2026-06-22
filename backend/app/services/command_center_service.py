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
from app.services.insight_support_service import DataCoverageService
from app.services.goal_service import GoalService
from app.services.benchmark_service import BenchmarkService


def _safe(fn, fallback):
    try:
        return fn()
    except Exception:
        return fallback


def _balance_sheet_section(session, company_id):
    """Balance-sheet figures, KPIs and insights for the Command Center.
    Returns None when no balance sheet has been uploaded so the UI can hide
    the section rather than show empty values."""
    from app.services.ingestion.balance_sheet_service import BalanceSheetService
    bs = BalanceSheetService(session)
    if not bs.has_balance_sheet(company_id):
        return None
    return {
        'available': True,
        'figures': bs.figures(company_id),
        'kpis': bs.kpis(company_id),
        'insights': bs.insights(company_id),
    }


def _cash_flow_section(session, company_id):
    """Cash-flow intelligence from imported bank statements. None when no bank
    data exists so the UI hides the section."""
    from app.services.cash_flow_service import CashFlowService
    from app.services.bank_reconciliation_service import BankReconciliationService
    cf = CashFlowService(session)
    if not cf.has_bank_data(company_id):
        return None
    section = {
        'available': True,
        'summary': cf.summary(company_id),
        'trend': cf.monthly_trend(company_id),
        'spending': cf.spending_breakdown(company_id),
        'insights': cf.insights(company_id),
        'runway': cf.runway(company_id),
        'forecast': cf.forecast(company_id),
    }
    try:
        section['reconciliation'] = BankReconciliationService(session).reconcile(company_id, persist=True)
    except Exception:
        section['reconciliation'] = {'available': False}
    return section


def _customer_section(session, company_id):
    """Customer Intelligence from sales data carrying customer names. None when
    no customer-attributed sales exist so the UI hides the section."""
    from app.services.intelligence.customer_intelligence_service import CustomerIntelligenceService
    ci = CustomerIntelligenceService(session)
    if not ci.has_customer_data(company_id):
        return None
    return ci.analyze(company_id)


def _opportunity_section(session, company_id):
    """Opportunity Intelligence aggregated across all engines. None when no
    opportunities can be derived so the UI hides the section."""
    from app.services.intelligence.opportunity_intelligence_service import OpportunityIntelligenceService
    data = OpportunityIntelligenceService(session).analyze(company_id)
    return data if data.get('available') else None


def _profitability_section(session, company_id):
    """Profitability Intelligence from an uploaded P&L statement. None when no
    P&L exists so the UI hides the section."""
    from app.services.ingestion.profit_loss_service import ProfitLossService
    pl = ProfitLossService(session)
    if not pl.has_pnl(company_id):
        return None
    return {
        'available': True,
        'figures': pl.figures(company_id),
        'kpis': pl.kpis(company_id),
        'insights': pl.insights(company_id),
    }


def _compliance_section(session, company_id):
    """Compliance = deadline calendar (when to file) + GST intelligence (how
    much / how healthy). Merges both so the dashboard shows liability and
    health alongside the filing calendar."""
    from app.services.intelligence.compliance_service import ComplianceIntelligenceService
    from app.services.intelligence.gst_intelligence_service import GSTIntelligenceService
    base = ComplianceIntelligenceService(session).analyze(company_id)
    if not isinstance(base, dict):
        base = {'available': False}
    gst = GSTIntelligenceService(session).analyze(company_id)
    if gst.get('available'):
        base['available'] = True
        base['gst'] = gst
    return base


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
            'cash_position': kpis.get('cash_position', 0),
            'receivable_days': kpis.get('receivable_days', 0),
            'runway_months': kpis.get('runway_months', 0),
            'working_capital': kpis.get('working_capital', 0),
            'vendor_dependency': kpis.get('vendor_dependency', 0),
            'churn_risk': kpis.get('churn_risk', 0),
            'burn_rate': kpis.get('burn_rate', 0),
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
            lambda: _compliance_section(self.session, company_id),
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

        # Data coverage meter, goals, benchmarking
        coverage = _safe(lambda: DataCoverageService(self.session).coverage(company_id), {})
        goals = _safe(lambda: GoalService(self.session).list_with_progress(company_id), {'available': False, 'goals': []})
        company = self.session.query(__import__('app.db.models.company', fromlist=['Company']).Company).filter_by(id=company_id).one_or_none()
        benchmark = _safe(lambda: BenchmarkService().compare(company.industry if company else None, kpis), {'available': False})
        billing = _safe(lambda: __import__('app.services.billing_service', fromlist=['BillingService']).BillingService(self.session).status(company_id), {'plan': 'starter'})

        # Outstanding receivables surfaced into the health strip if available.
        if collections.get('available'):
            health_section['outstanding_receivables'] = collections.get('outstanding_receivables', 0)
            health_section['cash_position'] = collections.get('total_collected', 0)

        balance_sheet = _safe(
            lambda: _balance_sheet_section(self.session, company_id),
            None,
        )

        cash_flow = _safe(
            lambda: _cash_flow_section(self.session, company_id),
            None,
        )

        customers = _safe(
            lambda: _customer_section(self.session, company_id),
            None,
        )

        opportunities = _safe(
            lambda: _opportunity_section(self.session, company_id),
            None,
        )

        profitability = _safe(
            lambda: _profitability_section(self.session, company_id),
            None,
        )

        return {
            'health': health_section,
            'action_center': action_center,
            'insights': insights,
            'compliance': compliance,
            'collections': collections,
            'product': product,
            'market': market,
            'freshness': freshness,
            'coverage': coverage,
            'goals': goals,
            'benchmark': benchmark,
            'billing': billing,
            'balance_sheet': balance_sheet,
            'cash_flow': cash_flow,
            'customers': customers,
            'opportunities': opportunities,
            'profitability': profitability,
            'generated_at': date.today().isoformat(),
        }
