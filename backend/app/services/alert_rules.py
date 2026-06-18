from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Expense, InventoryItem, Sale


SEVERITY_CRITICAL = 'critical'
SEVERITY_HIGH = 'high'
SEVERITY_MEDIUM = 'medium'
SEVERITY_LOW = 'low'


class AlertRuleEngine:
    def __init__(self, session: Session, company_id: Any, start_date: date, end_date: date):
        self.session = session
        self.company_id = company_id
        self.start_date = start_date
        self.end_date = end_date

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

    def _get_previous_period(self, days: int) -> (date, date):
        span = self.end_date - self.start_date + timedelta(days=1)
        previous_end = self.start_date - timedelta(days=1)
        previous_start = previous_end - (span - timedelta(days=1))
        return previous_start, previous_end

    def _get_customer_share(self) -> Decimal:
        subquery = (
            self.session.query(
                Sale.customer_id.label('customer_id'),
                func.sum(Sale.amount).label('revenue'),
            )
            .filter(
                Sale.company_id == self.company_id,
                Sale.invoice_date >= self.start_date,
                Sale.invoice_date <= self.end_date,
                Sale.customer_id.isnot(None),
            )
            .group_by(Sale.customer_id)
            .subquery()
        )

        total_revenue = self.session.query(func.coalesce(func.sum(subquery.c.revenue), 0)).scalar()
        top_revenue = self.session.query(func.coalesce(func.max(subquery.c.revenue), 0)).scalar()
        total = self._to_decimal(total_revenue)
        top = self._to_decimal(top_revenue)
        return top / total if total != 0 else Decimal('0')

    def _inventory_summary(self) -> List[InventoryItem]:
        return (
            self.session.query(InventoryItem)
            .filter(InventoryItem.company_id == self.company_id)
            .all()
        )

    def _expense_change(self) -> Decimal:
        previous_start, previous_end = self._get_previous_period(1)
        previous_sum = self.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == self.company_id,
            Expense.incurred_date >= previous_start,
            Expense.incurred_date <= previous_end,
        ).scalar()

        current_sum = self.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.company_id == self.company_id,
            Expense.incurred_date >= self.start_date,
            Expense.incurred_date <= self.end_date,
        ).scalar()

        prev = self._to_decimal(previous_sum)
        curr = self._to_decimal(current_sum)
        if prev == 0:
            return Decimal('100') if curr > 0 else Decimal('0')
        return (curr - prev) / prev * Decimal('100')

    def generate_rules(
        self,
        kpis: Dict[str, Any],
        health_score: Dict[str, Any],
    ) -> List[Dict[str, Any]]:

        alerts = []

        rule = self._profit_drop_alert(kpis)
        if rule:
            alerts.append(rule)

        rule = self._revenue_drop_alert(kpis)
        if rule:
            alerts.append(rule)

        rule = self._expense_spike_alert()
        if rule:
            alerts.append(rule)

        rule = self._inventory_shortage_alert()
        if rule:
            alerts.append(rule)

        rule = self._inventory_overstock_alert()
        if rule:
            alerts.append(rule)

        rule = self._customer_dependency_alert()
        if rule:
            alerts.append(rule)

        rule = self._health_score_risk_alert(health_score)
        if rule:
            alerts.append(rule)

        return alerts

    def _profit_drop_alert(self, kpis: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        profit_margin = self._to_decimal(kpis.get('profit_margin'))
        if profit_margin <= 0:
            severity = SEVERITY_CRITICAL
            title = 'Profit drop detected'
            description = 'Gross profit margin is zero or negative, indicating financial risk.'
        elif profit_margin < 10:
            severity = SEVERITY_HIGH
            title = 'Low profitability level'
            description = 'Profit margin is below 10% and should be monitored closely.'
        elif profit_margin < 20:
            severity = SEVERITY_MEDIUM
            title = 'Moderate profitability concern'
            description = 'Profit margin is below 20%, review cost and pricing decisions.'
        else:
            return None

        return {
            'alert_type': 'profit_drop',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }

    def _revenue_drop_alert(self, kpis: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        growth_rate = self._to_decimal(kpis.get('growth_rate'))
        if growth_rate < -20:
            severity = SEVERITY_CRITICAL
            title = 'Revenue decline alert'
            description = 'Revenue has dropped more than 20% compared to the previous period.'
        elif growth_rate < -10:
            severity = SEVERITY_HIGH
            title = 'Significant revenue drop'
            description = 'Revenue is down more than 10% compared to the previous period.'
        elif growth_rate < -5:
            severity = SEVERITY_MEDIUM
            title = 'Slight revenue decline'
            description = 'Revenue is down more than 5% compared to the previous period.'
        else:
            return None

        return {
            'alert_type': 'revenue_drop',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }

    def _expense_spike_alert(self) -> Optional[Dict[str, Any]]:
        change = self._expense_change()
        if change > 40:
            severity = SEVERITY_CRITICAL
            title = 'Expense spike detected'
            description = 'Expenses increased over 40% compared to the previous period.'
        elif change > 20:
            severity = SEVERITY_HIGH
            title = 'High expense increase'
            description = 'Expenses rose more than 20% compared to the previous period.'
        elif change > 10:
            severity = SEVERITY_MEDIUM
            title = 'Moderate expense increase'
            description = 'Expenses increased over 10% compared to the previous period.'
        else:
            return None

        return {
            'alert_type': 'expense_spike',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }

    def _inventory_shortage_alert(self) -> Optional[Dict[str, Any]]:
        items = self._inventory_summary()
        shortage_items = [item for item in items if item.reorder_level is not None and item.quantity <= item.reorder_level]
        if not shortage_items:
            return None

        severity = SEVERITY_HIGH if len(shortage_items) >= 3 else SEVERITY_MEDIUM
        title = 'Inventory shortage detected'
        description = (
            f'{len(shortage_items)} inventory items are below reorder levels. Review stock levels immediately.'
        )
        return {
            'alert_type': 'inventory_shortage',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }

    def _inventory_overstock_alert(self) -> Optional[Dict[str, Any]]:
        items = self._inventory_summary()
        overstock_items = [item for item in items if item.reorder_level is not None and item.quantity >= item.reorder_level * 3]
        if not overstock_items:
            return None

        severity = SEVERITY_MEDIUM if len(overstock_items) < 5 else SEVERITY_HIGH
        title = 'Inventory overstock condition'
        description = (
            f'{len(overstock_items)} items are stocked at more than three times reorder level. Consider reducing inventory.'
        )
        return {
            'alert_type': 'inventory_overstock',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }

    def _customer_dependency_alert(self) -> Optional[Dict[str, Any]]:
        share = self._get_customer_share()
        if share >= Decimal('0.5'):
            severity = SEVERITY_CRITICAL
            title = 'Customer dependency risk'
            description = 'A single customer represents over 50% of revenue, increasing concentration risk.'
        elif share >= Decimal('0.35'):
            severity = SEVERITY_HIGH
            title = 'High customer dependency'
            description = 'A single customer provides more than 35% of revenue.'
        elif share >= Decimal('0.2'):
            severity = SEVERITY_MEDIUM
            title = 'Moderate customer dependency'
            description = 'A single customer contributes more than 20% of revenue.'
        else:
            return None

        return {
            'alert_type': 'customer_dependency',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }

    def _health_score_risk_alert(self, health_score: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        score = self._to_decimal(health_score.get('health_score'))
        if score < 40:
            severity = SEVERITY_CRITICAL
            title = 'Business health risk'
            description = 'Health score is critically low, review all operational metrics immediately.'
        elif score < 55:
            severity = SEVERITY_HIGH
            title = 'Serious health score risk'
            description = 'Health score is low and requires attention from leadership.'
        elif score < 70:
            severity = SEVERITY_MEDIUM
            title = 'Moderate health score concern'
            description = 'Health score is below normal range and should be monitored.'
        elif score < 85:
            severity = SEVERITY_LOW
            title = 'Health score caution'
            description = 'Health score is below target, consider operational adjustments.'
        else:
            return None

        return {
            'alert_type': 'health_score_risk',
            'title': title,
            'description': description,
            'severity': severity,
            'status': 'open',
        }
