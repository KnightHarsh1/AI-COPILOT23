from decimal import Decimal
from typing import Any, Dict, List

from app.db.models import Alert


class RecommendationRulesEngine:
    def __init__(self, kpis: Dict[str, Any], health_score: Dict[str, Any], alerts: List[Alert], customer_metrics: Dict[str, Any], inventory_metrics: Dict[str, Any]):
        self.kpis = kpis
        self.health_score = health_score
        self.alerts = alerts
        self.customer_metrics = customer_metrics
        self.inventory_metrics = inventory_metrics

    @staticmethod
    def _to_decimal(value: Any) -> Decimal:
        if value is None:
            return Decimal('0')
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(str(value))
        except Exception:
            return Decimal('0')

    def _has_alert_type(self, alert_type: str) -> bool:
        return any(alert.alert_type == alert_type for alert in self.alerts)

    def generate_recommendations(self) -> List[Dict[str, Any]]:
        recommendations = []
        revenue = self._to_decimal(self.kpis.get('revenue'))
        profit_margin = self._to_decimal(self.kpis.get('profit_margin'))
        growth_rate = self._to_decimal(self.kpis.get('growth_rate'))
        inventory_turnover = self._to_decimal(self.kpis.get('inventory_turnover'))
        top_customer_share = self._to_decimal(self.customer_metrics.get('top_customer_share'))
        low_stock_count = int(self.inventory_metrics.get('low_stock_count', 0))
        expense_ratio = Decimal('100') - profit_margin

        if low_stock_count > 0 or inventory_turnover < Decimal('3'):
            priority = 'high' if low_stock_count > 0 else 'medium'
            recommendations.append({
                'recommendation_type': 'low_inventory',
                'title': 'Reorder inventory for low-stock items',
                'reason': (
                    f'Inventory turnover is {round(float(inventory_turnover), 2)} and {low_stock_count} item(s) are below reorder level, creating stockout risk.'
                ),
                'actions': [
                    'Review inventory items below reorder threshold.',
                    'Create purchase orders for critical stock.',
                    'Adjust safety stock levels for high-demand SKUs.',
                ],
                'priority': priority,
                'expected_impact': 'Avoids lost sales from stockouts and protects customer satisfaction.',
            })

        if top_customer_share >= Decimal('35'):
            priority = 'high' if top_customer_share >= Decimal('50') else 'medium'
            recommendations.append({
                'recommendation_type': 'high_customer_dependency',
                'title': 'Diversify customer portfolio',
                'reason': (
                    f'The top customer contributes {round(float(top_customer_share), 2)}% of revenue, increasing concentration risk.'
                ),
                'actions': [
                    'Target new customer segments with tailored offers.',
                    'Expand sales efforts in smaller accounts.',
                    'Reduce reliance on any single customer for revenue.',
                ],
                'priority': priority,
                'expected_impact': 'Reduces revenue volatility if the top customer churns or renegotiates terms.',
            })

        if expense_ratio > Decimal('70') or self._has_alert_type('expense_spike'):
            potential_savings = revenue * Decimal('0.05')
            recommendations.append({
                'recommendation_type': 'high_expenses',
                'title': 'Review cost and expense controls',
                'reason': (
                    f'Expense ratio is {round(float(expense_ratio), 2)}% of revenue, indicating potential cost pressure.'
                ),
                'actions': [
                    'Audit major expense categories for savings opportunities.',
                    'Negotiate supplier pricing and vendor terms.',
                    'Implement tighter approval workflows for discretionary spending.',
                ],
                'priority': 'high' if expense_ratio > Decimal('85') else 'medium',
                'expected_impact': (
                    f'A 5% cost reduction could free up roughly {round(float(potential_savings), 2)} per period.'
                    if potential_savings > 0 else 'Improves operating margin if costs are brought under control.'
                ),
            })

        if profit_margin < Decimal('15') or self._has_alert_type('profit_drop'):
            recommendations.append({
                'recommendation_type': 'low_profit_margin',
                'title': 'Review pricing and margin strategy',
                'reason': (
                    f'Profit margin is {round(float(profit_margin), 2)}%, below the healthy target range.'
                ),
                'actions': [
                    'Analyze product and service pricing against costs.',
                    'Identify low-margin offerings for repricing or discontinuation.',
                    'Explore bundled pricing to improve average transaction value.',
                ],
                'priority': 'high' if profit_margin <= Decimal('0') else 'medium',
                'expected_impact': 'A modest price increase of 2-3% on core offerings can materially improve net profit.',
            })

        if self._has_alert_type('inventory_shortage'):
            recommendations.append({
                'recommendation_type': 'inventory_shortage',
                'title': 'Resolve inventory shortage alerts',
                'reason': 'Inventory shortage alerts indicate items are depleted or under-ordered.',
                'actions': [
                    'Fast-track replenishment for affected products.',
                    'Review lead times and stock safety targets.',
                    'Monitor inventory levels daily until stock is restored.',
                ],
                'priority': 'high',
                'expected_impact': 'Prevents missed sales and customer churn caused by stockouts.',
            })

        if self._has_alert_type('customer_dependency'):
            recommendations.append({
                'recommendation_type': 'customer_dependency',
                'title': 'Address customer concentration risk',
                'reason': 'Customer dependency alerts show excessive revenue concentration in a single account.',
                'actions': [
                    'Broaden sales outreach to lower-risk accounts.',
                    'Deploy retention campaigns for smaller customers.',
                    'Limit revenue exposure to the top customer over time.',
                ],
                'priority': 'high',
                'expected_impact': 'Lowers the risk of a sudden revenue shock if a major account is lost.',
            })

        if growth_rate < Decimal('-5'):
            recommendations.append({
                'recommendation_type': 'revenue_decline',
                'title': 'Investigate and reverse revenue decline',
                'reason': f'Revenue growth rate is {round(float(growth_rate), 2)}% versus the prior period.',
                'actions': [
                    'Review which products or customers drove the decline.',
                    'Launch a win-back campaign for lapsed customers.',
                    'Re-evaluate pricing, promotions, or sales coverage gaps.',
                ],
                'priority': 'high' if growth_rate < Decimal('-15') else 'medium',
                'expected_impact': 'Recovering even half the decline would meaningfully stabilize monthly revenue.',
            })
        elif growth_rate > Decimal('10') and profit_margin > Decimal('15'):
            recommendations.append({
                'recommendation_type': 'growth_opportunity',
                'title': 'Capitalize on strong growth momentum',
                'reason': (
                    f'Revenue is growing {round(float(growth_rate), 2)}% with a healthy {round(float(profit_margin), 2)}% profit margin.'
                ),
                'actions': [
                    'Reinvest a portion of profit into the channels or products driving growth.',
                    'Increase inventory or staffing capacity ahead of continued demand.',
                    'Lock in favorable supplier or customer terms while leverage is strong.',
                ],
                'priority': 'low',
                'expected_impact': 'Compounding current growth could meaningfully scale revenue over the next few quarters.',
            })

        if self._has_alert_type('health_score_risk') or self._to_decimal(self.health_score.get('health_score')) < Decimal('60'):
            recommendations.append({
                'recommendation_type': 'health_score_review',
                'title': 'Review business health score components',
                'reason': 'The business health score is below healthy range, signaling operational risk.',
                'actions': [
                    'Analyze profitability, growth, and inventory health drivers.',
                    'Prioritize improvements for the weakest health components.',
                    'Follow up on active alerts and report risks.',
                ],
                'priority': 'medium',
                'expected_impact': 'Improves overall resilience and surfaces compounding risks early.',
            })

        seen_types = set()
        unique_recommendations = []
        for recommendation in recommendations:
            if recommendation['recommendation_type'] not in seen_types:
                seen_types.add(recommendation['recommendation_type'])
                unique_recommendations.append(recommendation)

        return unique_recommendations
