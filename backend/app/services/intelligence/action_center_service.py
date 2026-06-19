"""Daily AI Action Center engine.

Produces a single prioritized action list bucketed into three horizons —
Today's Priorities, Weekly Goals, Monthly Focus — by gathering candidate
actions from multiple deterministic sources:

  - open alerts (existing AlertService)
  - open recommendations (existing RecommendationService)
  - overdue invoices (from Collections engine)
  - imminent compliance deadlines (from Compliance engine)
  - low stock / dead stock (from Product engine)

Each action carries priority, reason, expected impact, and a recommended
action — exactly the shape the spec asks for. Scoring and bucketing are
fully deterministic and explainable; no AI is required for the ranking
(the Command Center may add AI narration on top separately).
"""

from datetime import date

from sqlalchemy.orm import Session

from app.db.models.alert import Alert
from app.db.models.recommendation import Recommendation
from app.services.intelligence.collections_service import CollectionsIntelligenceService
from app.services.intelligence.compliance_service import ComplianceIntelligenceService
from app.services.intelligence.product_service import ProductIntelligenceService

_PRIORITY_RANK = {'high': 0, 'medium': 1, 'low': 2}


def _action(category, priority, title, reason, impact, recommendation, horizon):
    return {
        'category': category,
        'priority': priority,
        'title': title,
        'reason': reason,
        'expected_impact': impact,
        'recommended_action': recommendation,
        'horizon': horizon,  # today | week | month
    }


class ActionCenterService:
    def __init__(self, session: Session):
        self.session = session

    def generate(self, company_id) -> dict:
        actions = []
        actions.extend(self._from_alerts(company_id))
        actions.extend(self._from_recommendations(company_id))
        actions.extend(self._from_collections(company_id))
        actions.extend(self._from_compliance(company_id))
        actions.extend(self._from_products(company_id))

        actions.sort(key=lambda a: _PRIORITY_RANK.get(a['priority'], 1))

        today = [a for a in actions if a['horizon'] == 'today']
        week = [a for a in actions if a['horizon'] == 'week']
        month = [a for a in actions if a['horizon'] == 'month']

        if not actions:
            today = [_action(
                'general', 'low',
                'No urgent actions right now',
                'Recent KPIs are within healthy ranges and nothing is overdue.',
                'Maintains current business health.',
                'Keep monitoring; check back after your next data import.',
                'today',
            )]

        return {
            'today': today[:6],
            'week': week[:6],
            'month': month[:6],
            'total_actions': len(actions),
        }

    def _from_alerts(self, company_id):
        alerts = (
            self.session.query(Alert)
            .filter(Alert.company_id == company_id, Alert.status == 'open')
            .all()
        )
        out = []
        for a in alerts:
            priority = 'high' if a.severity in ('critical', 'high') else (
                'medium' if a.severity == 'medium' else 'low'
            )
            out.append(_action(
                a.alert_type, priority, a.title,
                a.description or 'Detected from recent KPI and health-score trends.',
                'Reduces risk exposure if addressed promptly.',
                'Review the related recommendation for specific next steps.',
                'today' if priority == 'high' else 'week',
            ))
        return out

    def _from_recommendations(self, company_id):
        recs = (
            self.session.query(Recommendation)
            .filter(Recommendation.company_id == company_id, Recommendation.status == 'open')
            .all()
        )
        out = []
        for r in recs:
            actions_text = ' '.join(r.actions[:2]) if r.actions else 'Review the recommendation details.'
            priority = r.priority or 'medium'
            out.append(_action(
                r.recommendation_type, priority, r.title, r.reason,
                r.expected_impact or 'Improves the related business-health component.',
                actions_text,
                'week' if priority == 'high' else 'month',
            ))
        return out

    def _from_collections(self, company_id):
        data = CollectionsIntelligenceService(self.session).analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        aging = data.get('aging', {})
        seriously_overdue = aging.get('d61_90', 0) + aging.get('d90_plus', 0)
        if seriously_overdue > 0:
            out.append(_action(
                'collections', 'high',
                f'Chase ₹{seriously_overdue:,.0f} in seriously overdue payments',
                f'You have ₹{seriously_overdue:,.0f} unpaid for more than 60 days.',
                'Recovering this directly improves cash position.',
                'Call or send a payment reminder to the oldest overdue customers today.',
                'today',
            ))
        elif data.get('overdue_total', 0) > 0:
            out.append(_action(
                'collections', 'medium',
                f'Follow up on ₹{data["overdue_total"]:,.0f} in overdue invoices',
                'Some invoices have passed their due date.',
                'Faster collection improves working capital.',
                'Send polite payment reminders this week.',
                'week',
            ))
        if data.get('top_customer_share', 0) > 40:
            out.append(_action(
                'customer_risk', 'medium',
                f'Reduce dependency on {data.get("top_customer_name") or "your top customer"}',
                f'One customer is {data["top_customer_share"]}% of your revenue.',
                'Diversifying customers lowers revenue risk.',
                'Prioritize outreach to new or smaller customers this month.',
                'month',
            ))
        return out

    def _from_compliance(self, company_id):
        data = ComplianceIntelligenceService(self.session).analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        for d in data.get('overdue', []):
            out.append(_action(
                'compliance', 'high',
                f'Overdue: {d["title"]}',
                f'This filing was due on {d["due_date"]} and is now overdue.',
                'Avoids late fees, interest, and penalties.',
                'File immediately to limit penalty accrual.',
                'today',
            ))
        for d in data.get('upcoming', []):
            if d['status'] == 'due_soon':
                out.append(_action(
                    'compliance', 'high',
                    f'{d["title"]} due in {d["days_remaining"]} days',
                    f'This filing is due on {d["due_date"]}.',
                    'Filing on time avoids penalties.',
                    'Prepare and file before the due date.',
                    'today' if d['days_remaining'] <= 3 else 'week',
                ))
        return out

    def _from_products(self, company_id):
        data = ProductIntelligenceService(self.session).analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        for item in data.get('stockout_risk', [])[:3]:
            out.append(_action(
                'inventory_risk', 'high',
                f'Reorder {item["product_name"]} — stock is low',
                f'Quantity ({item["quantity"]}) is at or below the reorder level ({item["reorder_level"]}).',
                'Prevents lost sales from stockouts.',
                'Place a purchase order with your supplier.',
                'today',
            ))
        if data.get('dead_stock_value', 0) > 0 and data.get('dead_stock'):
            out.append(_action(
                'inventory_risk', 'medium',
                f'Clear ₹{data["dead_stock_value"]:,.0f} of dead stock',
                f'{len(data["dead_stock"])} product(s) haven\'t sold in 90+ days.',
                'Frees up cash tied in unsold inventory.',
                'Run a clearance promotion on the slowest movers this month.',
                'month',
            ))
        return out
