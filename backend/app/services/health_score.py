from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import Customer, Expense, InventoryItem, Metric, Sale
from app.services.kpi_engine import KPIService

# Max points for each component in the original 0-100 scheme. Used both
# to compute each component's raw score and as the weight when
# reweighting the total over only the components that have real data.
_COMPONENT_MAX_POINTS = {
    'revenue_growth_score': Decimal('30'),
    'profitability_score': Decimal('30'),
    'inventory_health_score': Decimal('20'),
    'customer_risk_score': Decimal('20'),
}
_LIQUIDITY_SOLVENCY_MAX_POINTS = Decimal('20')


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

    def _has_rows(self, model, company_id) -> bool:
        return self.session.query(model.id).filter(model.company_id == company_id).first() is not None

    def _component_eligibility(self, company_id) -> Dict[str, bool]:
        """Whether each component has real underlying data, independent
        of whether its computed score happens to be zero. This is the
        actual bug fix: a company with zero inventory rows previously
        got an inventory_health_score of 0 that dragged the total down;
        now that component is excluded from the total instead.
        """
        has_sales = self._has_rows(Sale, company_id)
        has_expenses = self._has_rows(Expense, company_id)

        return {
            # Growth needs at least some sales history to mean anything.
            'revenue_growth_score': has_sales,
            # Profitability needs evidence of both revenue and cost
            # tracking -- sales with zero recorded expenses would show a
            # misleading 100% margin, which is "no expense data yet",
            # not "perfectly profitable".
            'profitability_score': has_sales and has_expenses,
            'inventory_health_score': self._has_rows(InventoryItem, company_id),
            'customer_risk_score': self._has_rows(Customer, company_id),
        }

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

        # Every component is still always computed and always numeric --
        # report_service.py destructures and rounds these 4 keys
        # directly, so they must never become None. The fix happens at
        # the total-score level below, not here.
        component_scores = {
            'revenue_growth_score': self._normalize_score(revenue_growth, Decimal('20'), Decimal('30')),
            'profitability_score': self._normalize_score(profitability, Decimal('25'), Decimal('30')),
            'inventory_health_score': self._normalize_score(inventory_turnover, Decimal('8'), Decimal('20')),
            'customer_risk_score': self._normalize_score(customer_value, Decimal('1200'), Decimal('20')),
        }

        eligibility = self._component_eligibility(company_id)

        liquidity_data = self.kpi_service.calculate_liquidity_ratios(company_id)
        solvency_data = self.kpi_service.calculate_solvency_ratios(company_id)
        liquidity_solvency_eligible = bool(liquidity_data.get('available') and solvency_data.get('available'))
        liquidity_solvency_score: Optional[Decimal] = None

        if liquidity_solvency_eligible:
            current_ratio = liquidity_data.get('current_ratio')
            debt_to_equity = solvency_data.get('debt_to_equity')
            liquidity_part = (
                self._normalize_score(Decimal(str(current_ratio)), Decimal('2.0'), Decimal('10'))
                if current_ratio is not None else Decimal('5')  # undefined ratio -- neutral midpoint, not zero
            )
            if debt_to_equity is None:
                solvency_part = Decimal('5')  # undefined -- neutral midpoint
            else:
                solvency_part = max(Decimal('0'), Decimal('10') - (Decimal(str(debt_to_equity)) / Decimal('2.0')) * Decimal('10'))
                solvency_part = min(solvency_part, Decimal('10'))
            liquidity_solvency_score = liquidity_part + solvency_part

        # Reweight: sum only the components with real data, scaled against
        # only their combined max points, so missing data is excluded
        # rather than counted as a zero that drags the total down.
        eligible_raw_sum = Decimal('0')
        eligible_max_sum = Decimal('0')
        components_unavailable: List[Dict[str, str]] = []
        unavailable_reasons = {
            'revenue_growth_score': 'No sales data uploaded yet.',
            'profitability_score': 'Needs both sales and expense data to be meaningful.',
            'inventory_health_score': 'No inventory data uploaded yet.',
            'customer_risk_score': 'No customer data uploaded yet.',
        }

        for name, score in component_scores.items():
            if eligibility[name]:
                eligible_raw_sum += score
                eligible_max_sum += _COMPONENT_MAX_POINTS[name]
            else:
                components_unavailable.append({'component': name, 'reason': unavailable_reasons[name]})

        if liquidity_solvency_eligible and liquidity_solvency_score is not None:
            eligible_raw_sum += liquidity_solvency_score
            eligible_max_sum += _LIQUIDITY_SOLVENCY_MAX_POINTS
        else:
            components_unavailable.append({
                'component': 'liquidity_solvency_score',
                'reason': 'No balance sheet data uploaded yet.',
            })

        total_score = (eligible_raw_sum / eligible_max_sum * Decimal('100')) if eligible_max_sum > 0 else Decimal('0')
        total_score = min(total_score, Decimal('100'))

        total_possible_components = len(_COMPONENT_MAX_POINTS) + 1  # +1 for liquidity/solvency
        eligible_count = sum(1 for v in eligibility.values() if v) + (1 if liquidity_solvency_eligible else 0)
        data_completeness = Decimal('100') * Decimal(eligible_count) / Decimal(total_possible_components)

        payload = {
            'components': {k: float(round(v, 2)) for k, v in component_scores.items()},
            'liquidity_solvency_score': float(round(liquidity_solvency_score, 2)) if liquidity_solvency_score is not None else None,
            'data_completeness': float(round(data_completeness, 2)),
            'components_unavailable': components_unavailable,
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
            'revenue_growth_score': float(round(component_scores['revenue_growth_score'], 2)),
            'profitability_score': float(round(component_scores['profitability_score'], 2)),
            'inventory_health_score': float(round(component_scores['inventory_health_score'], 2)),
            'customer_risk_score': float(round(component_scores['customer_risk_score'], 2)),
            'liquidity_solvency_score': float(round(liquidity_solvency_score, 2)) if liquidity_solvency_score is not None else None,
            'data_completeness': float(round(data_completeness, 2)),
            'components_unavailable': components_unavailable,
            'period_start': kpis['period_start'],
            'period_end': kpis['period_end'],
            'payload': payload,
        }
