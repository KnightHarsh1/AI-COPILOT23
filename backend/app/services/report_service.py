from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Alert, InventoryItem, Report, Sale
from app.services.alert_service import AlertService
from app.services.health_score import HealthScoreService
from app.services.kpi_engine import KPIService
from app.services.recommendation_service import RecommendationService


REPORT_TYPES = {
    'revenue': 'Revenue Report',
    'profit': 'Profit Report',
    'customer': 'Customer Report',
    'inventory': 'Inventory Report',
    'health': 'Business Health Report',
}


class ReportService:
    def __init__(self, session: Session):
        self.session = session
        self.kpi_service = KPIService(session)
        self.health_service = HealthScoreService(session)
        self.alert_service = AlertService(session)

    @staticmethod
    def _normalize_decimal(value: Any) -> Decimal:
        if value is None:
            return Decimal('0')
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(str(value))
        except Exception:
            return Decimal('0')

    @staticmethod
    def _to_float(value: Any) -> float:
        return float(round(Decimal(value), 4)) if value is not None else 0.0

    def _previous_period(self, start_date: date, end_date: date) -> (date, date):
        span = end_date - start_date + timedelta(days=1)
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - (span - timedelta(days=1))
        return previous_start, previous_end

    def _get_customer_metrics(self, company_id: Any, start_date: date, end_date: date) -> Dict[str, Any]:
        total_revenue = self.session.query(func.coalesce(func.sum(Sale.amount), 0)).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()

        customer_revenue_subquery = (
            self.session.query(
                Sale.customer_id.label('customer_id'),
                func.sum(Sale.amount).label('revenue'),
            )
            .filter(
                Sale.company_id == company_id,
                Sale.invoice_date >= start_date,
                Sale.invoice_date <= end_date,
                Sale.customer_id.isnot(None),
            )
            .group_by(Sale.customer_id)
            .subquery()
        )

        top_customer_revenue = self.session.query(func.coalesce(func.max(customer_revenue_subquery.c.revenue), 0)).scalar()

        customer_count = self.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
            Sale.customer_id.isnot(None),
        ).scalar()

        order_count = self.session.query(func.count(Sale.id)).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()

        avg_order_value = Decimal('0')
        if order_count:
            avg_order_value = self._normalize_decimal(total_revenue) / Decimal(order_count)

        concentration = Decimal('0')
        if total_revenue and top_customer_revenue is not None:
            total = self._normalize_decimal(total_revenue)
            top = self._normalize_decimal(top_customer_revenue)
            if total != 0:
                concentration = top / total

        return {
            'customer_count': int(customer_count or 0),
            'order_count': int(order_count or 0),
            'average_order_value': self._to_float(avg_order_value),
            'top_customer_share': self._to_float(concentration * Decimal('100')),
            'total_revenue': self._to_float(total_revenue),
        }

    def _get_inventory_metrics(self, company_id: Any, start_date: date, end_date: date) -> Dict[str, Any]:
        stock_value = self.session.query(
            func.coalesce(func.sum(InventoryItem.quantity * InventoryItem.unit_cost), 0)
        ).filter(InventoryItem.company_id == company_id).scalar()

        inventory_count = self.session.query(func.count(InventoryItem.id)).filter(
            InventoryItem.company_id == company_id,
        ).scalar()

        low_stock_count = self.session.query(func.count(InventoryItem.id)).filter(
            InventoryItem.company_id == company_id,
            InventoryItem.reorder_level.isnot(None),
            InventoryItem.quantity <= InventoryItem.reorder_level,
        ).scalar()

        overstock_count = self.session.query(func.count(InventoryItem.id)).filter(
            InventoryItem.company_id == company_id,
            InventoryItem.reorder_level.isnot(None),
            InventoryItem.quantity >= InventoryItem.reorder_level * 3,
        ).scalar()

        return {
            'inventory_count': int(inventory_count or 0),
            'stock_value': self._to_float(stock_value),
            'low_stock_count': int(low_stock_count or 0),
            'overstock_count': int(overstock_count or 0),
        }

    def _build_report_payload(
        self,
        report_type: str,
        kpis: Dict[str, Any],
        previous_kpis: Dict[str, Any],
        health_score: Dict[str, Any],
        alerts: List[Alert],
        customer_metrics: Dict[str, Any],
        inventory_metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        alert_messages = [f"{alert.title}: {alert.description or ''}".strip() for alert in alerts[:3]]
        risk_details = [
            *alert_messages,
        ]

        if report_type == 'revenue':
            trend_value = kpis['growth_rate']
            metrics = {
                'revenue': kpis['revenue'],
                'growth_rate': kpis['growth_rate'],
                'average_customer_value': kpis['customer_value'],
                'top_customer_share': customer_metrics['top_customer_share'],
            }
            risks = [
                'Revenue growth is negative.' if trend_value < 0 else 'Revenue growth is slowing.' if trend_value < 5 else 'Revenue is stable.',
            ]
            if customer_metrics['top_customer_share'] >= 35:
                risks.append('High customer concentration risk detected.')
            risks.extend(risk_details)
            recommendations = [
                'Diversify the customer base to reduce concentration risk.',
                'Improve cross-sell and upsell for stable accounts.',
                'Align sales forecasts with recent growth performance.',
            ]
            summary = (
                'Revenue performance includes top-line income, customer-driven demand, and customer concentration signals for the period.'
            )
            trends = [
                f"Revenue changed by {round(trend_value, 2)}% compared to the previous period.",
                f"Average customer value is ${round(kpis['customer_value'], 2)} and top customer share is {round(customer_metrics['top_customer_share'], 2)}%.",
            ]

        elif report_type == 'profit':
            profit_change = 0.0
            if previous_kpis['net_profit'] != 0:
                profit_change = (kpis['net_profit'] - previous_kpis['net_profit']) / abs(previous_kpis['net_profit']) * 100
            metrics = {
                'net_profit': kpis['net_profit'],
                'gross_profit': kpis['gross_profit'],
                'profit_margin': kpis['profit_margin'],
                'expense_ratio': round(100 - kpis['profit_margin'], 2),
            }
            risks = [
                'Profit margins remain under pressure.' if kpis['profit_margin'] < 15 else 'Profit margin is healthy.' ,
            ]
            if kpis['profit_margin'] < 10:
                risks.append('Low profitability may threaten cash flow if costs continue to rise.')
            risks.extend(risk_details)
            recommendations = [
                'Review cost of goods sold and reduce variable expenses.',
                'Focus on higher-margin product or service lines.',
                'Monitor expenses relative to revenue weekly.',
            ]
            summary = 'Profit report captures revenue-to-cost performance and covers trends in margin, net profit, and expense pressure.'
            trends = [
                f"Net profit changed by {round(profit_change, 2)}% compared to the previous period.",
                f"Current profit margin is {round(kpis['profit_margin'], 2)}%.",
            ]

        elif report_type == 'customer':
            metrics = {
                'customer_count': customer_metrics['customer_count'],
                'average_order_value': customer_metrics['average_order_value'],
                'top_customer_share': customer_metrics['top_customer_share'],
                'revenue_per_customer': kpis['customer_value'],
            }
            risks = [
                'Top customer revenue share is elevated.' if customer_metrics['top_customer_share'] > 35 else 'Customer distribution is balanced.' ,
            ]
            if customer_metrics['customer_count'] < 5:
                risks.append('Customer base is small and could be vulnerable to churn.')
            risks.extend(risk_details)
            recommendations = [
                'Expand customer acquisition channels while improving retention.',
                'Increase customer lifetime value with loyalty and product bundles.',
                'Analyze low-value accounts for upsell opportunities.',
            ]
            summary = 'Customer report reviews account diversity, average order values, and customer revenue concentration.'
            trends = [
                f"Average order value is ${round(customer_metrics['average_order_value'], 2)}.",
                f"Top customer share is {round(customer_metrics['top_customer_share'], 2)}% of revenue.",
            ]

        elif report_type == 'inventory':
            metrics = {
                'inventory_count': inventory_metrics['inventory_count'],
                'stock_value': inventory_metrics['stock_value'],
                'inventory_turnover': kpis['inventory_turnover'],
                'low_stock_count': inventory_metrics['low_stock_count'],
                'overstock_count': inventory_metrics['overstock_count'],
            }
            risks = [
                'Inventory turnover is low, which can tie up cash.' if kpis['inventory_turnover'] < 3 else 'Inventory turnover is within a healthy range.',
            ]
            if inventory_metrics['low_stock_count'] > 0:
                risks.append('Some items are below reorder level and could cause stockouts.')
            if inventory_metrics['overstock_count'] > 0:
                risks.append('Some items are overstocked and may increase carrying costs.')
            risks.extend(risk_details)
            recommendations = [
                'Rebalance inventory levels and prioritize fast-moving items.',
                'Clear slow-moving stock to free working capital.',
                'Review reorder points against demand patterns.',
            ]
            summary = 'Inventory report measures stock efficiency, carrying value, and availability risks.'
            trends = [
                f"Inventory turnover is {round(kpis['inventory_turnover'], 2)}.",
                f"Low stock count is {inventory_metrics['low_stock_count']} and overstock count is {inventory_metrics['overstock_count']}.",
            ]

        else:
            metrics = {
                'health_score': health_score['health_score'],
                'revenue_growth_score': health_score['revenue_growth_score'],
                'profitability_score': health_score['profitability_score'],
                'inventory_health_score': health_score['inventory_health_score'],
                'customer_risk_score': health_score['customer_risk_score'],
            }
            risks = [
                'Overall business health is below ideal if score is under 70.' if health_score['health_score'] < 70 else 'Business health score is strong.',
            ]
            if health_score['health_score'] < 55:
                risks.append('Low health score indicates operational issues across revenue, costs, or customer metrics.')
            risks.extend(risk_details)
            recommendations = [
                'Focus on the weakest health score components first.',
                'Coordinate finance and operations to improve cash flow and margins.',
                'Use alert trends to address the most urgent business risks.',
            ]
            summary = 'Business health report synthesizes KPI performance, operational health, and alert-driven risk factors.'
            trends = [
                f"Health score is {round(health_score['health_score'], 2)}.",
                f"Profitability component is {round(health_score['profitability_score'], 2)} and revenue growth component is {round(health_score['revenue_growth_score'], 2)}.",
            ]

        return {
            'summary': summary,
            'metrics': metrics,
            'trends': trends,
            'risks': risks,
            'recommendations': recommendations,
            'alerts': alert_messages,
        }

    def generate_report(
        self,
        company_id: Any,
        generated_by_id: Any,
        report_type: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Report:
        report_type = report_type.lower()
        if report_type not in REPORT_TYPES:
            raise ValueError('Unsupported report type')

        end_date = end_date or date.today()
        start_date = start_date or (end_date - timedelta(days=29))

        current_kpis = self.kpi_service.calculate_kpis(company_id, start_date, end_date)
        health_score = self.health_service.calculate_health_score(company_id, start_date, end_date)
        self.alert_service.generate_alerts(company_id, start_date, end_date)
        open_alerts = self.alert_service.list_alerts(company_id, status='open')

        previous_start, previous_end = self._previous_period(start_date, end_date)
        previous_kpis = self.kpi_service.calculate_kpis(company_id, previous_start, previous_end)

        customer_metrics = self._get_customer_metrics(company_id, start_date, end_date)
        inventory_metrics = self._get_inventory_metrics(company_id, start_date, end_date)

        payload = self._build_report_payload(
            report_type,
            current_kpis,
            previous_kpis,
            health_score,
            open_alerts,
            customer_metrics,
            inventory_metrics,
        )

        report = Report(
            company_id=company_id,
            generated_by_id=generated_by_id,
            name=REPORT_TYPES[report_type],
            report_type=report_type,
            status='generated',
            generated_at=datetime.utcnow(),
            period_start=start_date,
            period_end=end_date,
            payload=payload,
        )
        self.session.add(report)
        self.session.commit()
        self.session.refresh(report)

        RecommendationService(self.session).generate_recommendations(
            company_id=company_id,
            generated_by_id=generated_by_id,
            start_date=start_date,
            end_date=end_date,
        )

        return report

    def list_reports(
        self,
        company_id: Any,
        report_type: Optional[str] = None,
    ) -> List[Report]:
        query = self.session.query(Report).filter(Report.company_id == company_id)
        if report_type:
            query = query.filter(Report.report_type == report_type.lower())
        return query.order_by(Report.generated_at.desc()).all()

    def get_report(self, company_id: Any, report_id: Any) -> Optional[Report]:
        return (
            self.session.query(Report)
            .filter(Report.company_id == company_id, Report.id == report_id)
            .one_or_none()
        )
