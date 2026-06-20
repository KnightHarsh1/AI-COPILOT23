"""Weekly business summary digest, composed from existing services. Used by
the dashboard and (when delivery is configured) email/WhatsApp."""

from sqlalchemy.orm import Session

from app.services.kpi_engine import KPIService
from app.services.intelligence.action_center_service import ActionCenterService
from app.services.intelligence.collections_service import CollectionsIntelligenceService


def _inr(n):
    n = float(n or 0)
    if abs(n) >= 1e7: return f"₹{n/1e7:.1f}Cr"
    if abs(n) >= 1e5: return f"₹{n/1e5:.1f}L"
    if abs(n) >= 1e3: return f"₹{n/1e3:.0f}K"
    return f"₹{n:.0f}"


class WeeklySummaryService:
    def __init__(self, session: Session):
        self.session = session

    def build(self, company_id) -> dict:
        kpis = KPIService(self.session).calculate_kpis(company_id)
        actions = ActionCenterService(self.session).generate(company_id)
        collections = CollectionsIntelligenceService(self.session).analyze(company_id)

        lines = [
            f"Revenue: {_inr(kpis.get('revenue'))}",
            f"Net profit: {_inr(kpis.get('net_profit'))}",
        ]
        if collections.get('available'):
            lines.append(f"Outstanding to collect: {_inr(collections.get('outstanding_receivables'))}")
        top_today = (actions.get('today') or [])[:1]
        if top_today:
            lines.append(f"Top priority: {top_today[0]['title']}")

        return {
            'headline': "Your week at a glance",
            'lines': lines,
            'top_actions': (actions.get('today') or [])[:3],
            'as_text': " · ".join(lines),
        }
