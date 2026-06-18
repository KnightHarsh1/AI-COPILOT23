from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Expense, InventoryItem, Metric, Sale


COGS_CATEGORIES = {
    'cogs',
    'cost_of_goods_sold',
    'cost of goods sold',
    'cost of goods',
    'goods sold',
}


class KPIService:
    """Computes and persists core business KPIs for a company.

    Note: this service is intentionally pure (compute + persist metrics only).
    Alert generation lives exclusively in AlertService / AlertRuleEngine so
    there is a single source of truth for business risk signals.
    """

    def __init__(self, session: Session):
        self.session = session

    @staticmethod
    def _normalize_value(value: Any) -> Decimal:
        if value is None:
            return Decimal('0')
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(str(value))
        except Exception:
            return Decimal('0')

    def _get_revenue(self, company_id, start_date, end_date):
        revenue = self.session.query(
            func.coalesce(func.sum(Sale.amount), 0)
        ).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
        ).scalar()

        return self._normalize_value(revenue)

    def _get_total_expenses(self, company_id, start_date: date, end_date: date) -> Decimal:
        expenses = self.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == company_id,
            Expense.incurred_date >= start_date,
            Expense.incurred_date <= end_date,
        ).scalar()
        return self._normalize_value(expenses)

    def _get_cogs(self, company_id, start_date: date, end_date: date) -> Decimal:
        cogs = self.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == company_id,
            Expense.incurred_date >= start_date,
            Expense.incurred_date <= end_date,
            func.lower(func.coalesce(Expense.category, '')).in_(COGS_CATEGORIES),
        ).scalar()
        cogs_value = self._normalize_value(cogs)
        if cogs_value == 0:
            return self._get_total_expenses(company_id, start_date, end_date)
        return cogs_value

    def _get_customer_value(self, company_id, start_date: date, end_date: date, revenue: Decimal) -> Decimal:
        customer_count = self.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.company_id == company_id,
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date,
            Sale.customer_id.isnot(None),
        ).scalar()

        if not customer_count:
            return Decimal('0')
        return revenue / Decimal(customer_count)

    def _get_inventory_turnover(self, company_id, start_date: date, end_date: date) -> Decimal:
        avg_inventory = self.session.query(
            func.coalesce(func.avg(InventoryItem.quantity * InventoryItem.unit_cost), 0)
        ).filter(InventoryItem.company_id == company_id).scalar()
        avg_inventory_value = self._normalize_value(avg_inventory)
        cogs = self._get_cogs(company_id, start_date, end_date)
        if avg_inventory_value == 0:
            return Decimal('0')
        return cogs / avg_inventory_value

    def _get_growth_rate(self, company_id, start_date: date, end_date: date) -> Decimal:
        period_days = (end_date - start_date).days + 1
        previous_start = start_date - timedelta(days=period_days)
        previous_end = end_date - timedelta(days=period_days)

        current_revenue = self._get_revenue(company_id, start_date, end_date)
        previous_revenue = self._get_revenue(company_id, previous_start, previous_end)

        if previous_revenue == 0:
            return Decimal('100') if current_revenue > 0 else Decimal('0')

        return (current_revenue - previous_revenue) / previous_revenue * Decimal('100')

    def _persist_metric(
        self,
        name: str,
        value: Decimal,
        company_id,
        period_start: date,
        period_end: date,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        metric = (
            self.session.query(Metric)
            .filter(
                Metric.company_id == company_id,
                Metric.name == name,
                Metric.period_start == period_start,
                Metric.period_end == period_end,
            )
            .first()
        )

        if metric is None:
            metric = Metric(
                company_id=company_id,
                name=name,
                value=value,
                period_start=period_start,
                period_end=period_end,
                payload=payload,
            )
            self.session.add(metric)
        else:
            metric.value = value
            metric.payload = payload

        self.session.commit()
        return metric

    def _to_float(self, value: Decimal) -> float:
        return float(round(value, 4))

    def calculate_kpis(
        self,
        company_id,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:

        end_date = end_date or date.today()
        start_date = start_date or (end_date - timedelta(days=29))

        revenue = self._get_revenue(company_id, start_date, end_date)
        total_expenses = self._get_total_expenses(company_id, start_date, end_date)
        gross_profit = revenue - self._get_cogs(company_id, start_date, end_date)
        net_profit = revenue - total_expenses

        profit_margin = Decimal('0')
        if revenue != 0:
            profit_margin = (net_profit / revenue) * Decimal('100')

        customer_value = self._get_customer_value(company_id, start_date, end_date, revenue)
        inventory_turnover = self._get_inventory_turnover(company_id, start_date, end_date)
        growth_rate = self._get_growth_rate(company_id, start_date, end_date)

        results = {
            'revenue': self._to_float(revenue),
            'gross_profit': self._to_float(gross_profit),
            'net_profit': self._to_float(net_profit),
            'total_expenses': self._to_float(total_expenses),
            'profit_margin': self._to_float(profit_margin),
            'growth_rate': self._to_float(growth_rate),
            'customer_value': self._to_float(customer_value),
            'inventory_turnover': self._to_float(inventory_turnover),
            'period_start': start_date,
            'period_end': end_date,
        }

        for metric_name, decimal_value in (
            ('revenue', revenue),
            ('gross_profit', gross_profit),
            ('net_profit', net_profit),
            ('profit_margin', profit_margin),
            ('growth_rate', growth_rate),
            ('customer_value', customer_value),
            ('inventory_turnover', inventory_turnover),
        ):
            self._persist_metric(metric_name, decimal_value, company_id, start_date, end_date)

        return results
