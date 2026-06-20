from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Alert, InventoryItem, Recommendation, Sale
from app.services.alert_service import AlertService
from app.services.health_score import HealthScoreService
from app.services.kpi_engine import KPIService
from app.services.recommendation_rules import RecommendationRulesEngine


class RecommendationService:
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

    def _get_customer_metrics(self, company_id: Any, start_date: date, end_date: date) -> Dict[str, Any]:
        total_revenue = self.session.query(func.coalesce(func.sum(Sale.amount), 0)).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()

        customer_revenue = (
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

        top_customer_revenue = self.session.query(func.coalesce(func.max(customer_revenue.c.revenue), 0)).scalar()
        order_count = self.session.query(func.count(Sale.id)).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()
        customer_count = self.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
            Sale.customer_id.isnot(None),
        ).scalar()

        avg_order_value = Decimal('0')
        if order_count:
            avg_order_value = self._normalize_decimal(total_revenue) / Decimal(order_count)

        top_share = Decimal('0')
        if total_revenue and top_customer_revenue is not None:
            total = self._normalize_decimal(total_revenue)
            top = self._normalize_decimal(top_customer_revenue)
            if total != 0:
                top_share = top / total * Decimal('100')

        return {
            'customer_count': int(customer_count or 0),
            'order_count': int(order_count or 0),
            'average_order_value': float(round(avg_order_value, 2)),
            'top_customer_share': float(round(top_share, 2)),
            'total_revenue': float(round(self._normalize_decimal(total_revenue), 2)),
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
            'stock_value': float(round(self._normalize_decimal(stock_value), 2)),
            'low_stock_count': int(low_stock_count or 0),
            'overstock_count': int(overstock_count or 0),
        }

    def _should_skip_duplicate(self, company_id: Any, recommendation_type: str, title: str) -> bool:
        existing = (
            self.session.query(Recommendation)
            .filter(
                Recommendation.company_id == company_id,
                Recommendation.recommendation_type == recommendation_type,
                Recommendation.title == title,
                Recommendation.status == 'open',
            )
            .one_or_none()
        )
        return existing is not None

    def generate_recommendations(
        self,
        company_id: Any,
        generated_by_id: Any,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Recommendation]:
        end_date = end_date or date.today()
        start_date = start_date or (end_date - timedelta(days=29))

        kpis = self.kpi_service.calculate_kpis(company_id, start_date, end_date)
        health_score = self.health_service.calculate_health_score(company_id, start_date, end_date)
        open_alerts = self.alert_service.list_alerts(company_id, status='open')
        customer_metrics = self._get_customer_metrics(company_id, start_date, end_date)
        inventory_metrics = self._get_inventory_metrics(company_id, start_date, end_date)

        engine = RecommendationRulesEngine(
            kpis=kpis,
            health_score=health_score,
            alerts=open_alerts,
            customer_metrics=customer_metrics,
            inventory_metrics=inventory_metrics,
        )
        rules = engine.generate_recommendations()

        fresh_keys = {(rule['recommendation_type'], rule['title']) for rule in rules}

        # Supersede stale open recommendations no longer produced by the
        # latest data, so the Action Center reflects current numbers.
        stale = (
            self.session.query(Recommendation)
            .filter(
                Recommendation.company_id == company_id,
                Recommendation.status == 'open',
            )
            .all()
        )
        for old in stale:
            if (old.recommendation_type, old.title) not in fresh_keys:
                old.status = 'dismissed'

        recommendations: List[Recommendation] = []
        for rule in rules:
            if self._should_skip_duplicate(company_id, rule['recommendation_type'], rule['title']):
                continue
            recommendation = Recommendation(
                company_id=company_id,
                generated_by_id=generated_by_id,
                recommendation_type=rule['recommendation_type'],
                title=rule['title'],
                reason=rule['reason'],
                actions=rule['actions'],
                priority=rule.get('priority', 'medium'),
                expected_impact=rule.get('expected_impact'),
                status='open',
                generated_at=datetime.utcnow(),
            )
            self.session.add(recommendation)
            recommendations.append(recommendation)

        self.session.commit()
        return recommendations

    def list_recommendations(
        self,
        company_id: Any,
        recommendation_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Recommendation]:
        query = self.session.query(Recommendation).filter(Recommendation.company_id == company_id)
        if recommendation_type:
            query = query.filter(Recommendation.recommendation_type == recommendation_type)
        if status:
            query = query.filter(Recommendation.status == status)
        return query.order_by(Recommendation.generated_at.desc()).all()

    def get_recommendation(self, company_id: Any, recommendation_id: Any) -> Optional[Recommendation]:
        return (
            self.session.query(Recommendation)
            .filter(Recommendation.company_id == company_id, Recommendation.id == recommendation_id)
            .one_or_none()
        )
