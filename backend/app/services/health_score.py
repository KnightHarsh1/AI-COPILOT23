from datetime import date
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import Metric
from app.services.kpi_engine import KPIService


class HealthScoreService:
    def __init__(self, session: Session):
        self.session = session
        self.kpi_service = KPIService(session)

    @staticmethod
    def _normalize_score(value: Decimal, threshold: Decimal, max_points: Decimal) -> Decimal:
        if value <= 0:
            return Decimal('0')
        score = value / threshold * max_points
        if score > max_points:
            return max_points
        return score

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

    def _persist_health_score(
        self,
        company_id,
        score: Decimal,
        start_date: date,
        end_date: date,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        metric = (
            self.session.query(Metric)
            .filter(
                Metric.company_id == company_id,
                Metric.name == 'health_score',
                Metric.period_start == start_date,
                Metric.period_end == end_date,
            )
            .one_or_none()
        )

        if metric is None:
            metric = Metric(
                company_id=company_id,
                name='health_score',
                value=score,
                period_start=start_date,
                period_end=end_date,
                payload=payload,
            )
            self.session.add(metric)
        else:
            metric.value = score
            metric.payload = payload

        self.session.commit()
        return metric

    def calculate_health_score(
        self,
        company_id,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        kpis = self.kpi_service.calculate_kpis(company_id, start_date, end_date)

        revenue_growth = self._to_decimal(kpis['growth_rate'])
        profitability = self._to_decimal(kpis['profit_margin'])
        inventory_turnover = self._to_decimal(kpis['inventory_turnover'])
        customer_value = self._to_decimal(kpis['customer_value'])

        revenue_growth_score = self._normalize_score(revenue_growth, Decimal('20'), Decimal('30'))
        profitability_score = self._normalize_score(profitability, Decimal('25'), Decimal('30'))
        inventory_health_score = self._normalize_score(inventory_turnover, Decimal('8'), Decimal('20'))
        customer_risk_score = self._normalize_score(customer_value, Decimal('1200'), Decimal('20'))

        total_score = revenue_growth_score + profitability_score + inventory_health_score + customer_risk_score
        if total_score > Decimal('100'):
            total_score = Decimal('100')

        payload = {
    'components': {
        'revenue_growth_score': float(round(revenue_growth_score, 2)),
        'profitability_score': float(round(profitability_score, 2)),
        'inventory_health_score': float(round(inventory_health_score, 2)),
        'customer_risk_score': float(round(customer_risk_score, 2)),
    },
    'kpis': {
        **kpis,
        'period_start': str(kpis['period_start']),
        'period_end': str(kpis['period_end']),
    },
}

        self._persist_health_score(
            company_id=company_id,
            score=total_score,
            start_date=kpis['period_start'],
            end_date=kpis['period_end'],
            payload=payload,
        )

        return {
            'health_score': float(round(total_score, 2)),
            'revenue_growth_score': float(round(revenue_growth_score, 2)),
            'profitability_score': float(round(profitability_score, 2)),
            'inventory_health_score': float(round(inventory_health_score, 2)),
            'customer_risk_score': float(round(customer_risk_score, 2)),
            'period_start': kpis['period_start'],
            'period_end': kpis['period_end'],
            'payload': payload,
        }
