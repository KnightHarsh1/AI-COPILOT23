"""Audit trail, data-coverage meter, and KPI/health explainers."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.growth import AuditLog
from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.db.models.inventory import InventoryItem
from app.db.models.customer import Customer


class AuditService:
    def __init__(self, session: Session):
        self.session = session

    def log(self, company_id, event_type, title, detail=None, user_id=None):
        try:
            self.session.add(AuditLog(
                company_id=company_id, user_id=user_id,
                event_type=event_type, title=title, detail=detail,
            ))
            self.session.commit()
        except Exception:
            self.session.rollback()

    def timeline(self, company_id, limit=50):
        rows = self.session.query(AuditLog).filter(
            AuditLog.company_id == company_id
        ).order_by(AuditLog.created_at.desc()).limit(limit).all()
        return [{
            'event_type': r.event_type,
            'title': r.title,
            'detail': r.detail,
            'created_at': r.created_at.isoformat() if r.created_at else None,
        } for r in rows]


class DataCoverageService:
    """Business Data Coverage meter: which data types are present and what
    each unlocks. Drives onboarding guidance and smart empty states."""

    def __init__(self, session: Session):
        self.session = session

    def _count(self, model, company_id):
        return self.session.query(func.count(model.id)).filter(model.company_id == company_id).scalar() or 0

    def coverage(self, company_id) -> dict:
        has_sales = self._count(Sale, company_id) > 0
        has_expenses = self._count(Expense, company_id) > 0
        has_inventory = self._count(InventoryItem, company_id) > 0
        has_customers = self._count(Customer, company_id) > 0

        items = [
            {'key': 'sales', 'label': 'Sales', 'present': has_sales,
             'unlocks': 'Revenue, Collections, Customers'},
            {'key': 'expenses', 'label': 'Expenses', 'present': has_expenses,
             'unlocks': 'Net Profit, Health Score'},
            {'key': 'inventory', 'label': 'Inventory', 'present': has_inventory,
             'unlocks': 'Product Intelligence, Stockout alerts'},
            {'key': 'customers', 'label': 'Customers', 'present': has_customers,
             'unlocks': 'Customer insights'},
        ]
        present = sum(1 for i in items if i['present'])
        score = round(present / len(items) * 100)
        missing = [i for i in items if not i['present']]
        next_step = None
        if not has_sales:
            next_step = 'Upload your Sales data first — it unlocks the most.'
        elif not has_expenses:
            next_step = 'Add Expenses to unlock Profit and your Health Score.'
        elif not has_inventory:
            next_step = 'Add Inventory to unlock Product Intelligence.'
        elif missing:
            next_step = f"Add {missing[0]['label']} to complete your data."

        return {
            'coverage_score': score,
            'present_count': present,
            'total': len(items),
            'items': items,
            'next_step': next_step,
            'is_complete': present == len(items),
        }


_KPI_EXPLANATIONS = {
    'revenue': 'Total money your business earned from sales in this period.',
    'net_profit': 'What you keep after subtracting all expenses from revenue. The bottom line.',
    'profit_margin': 'How many paise of profit you make on every rupee of sales. Higher is healthier.',
    'cash_position': 'Money actually collected minus money spent — your real cash on hand from operations.',
    'receivable_days': 'On average, how many days customers take to pay you. Lower means faster cash.',
    'runway_months': 'If you keep losing money at the current rate, how many months your cash lasts.',
    'working_capital': 'Short-term assets (receivables + stock) available to run day-to-day operations.',
    'burn_rate': 'How much cash you lose per month when running at a loss.',
    'vendor_dependency': 'Share of your spending going to a single supplier. High means supplier risk.',
    'churn_risk': 'Share of past customers who have stopped buying recently. High means losing customers.',
    'growth_rate': 'How fast your revenue is growing compared to the previous period.',
    'inventory_turnover': 'How many times you sell through your stock in a year. Higher means efficient stock.',
    'health_score': 'A single 0–100 score blending growth, profitability, inventory, and customer health.',
}


def explain_kpi(metric: str) -> str:
    return _KPI_EXPLANATIONS.get(metric, 'A measure of your business performance.')


def all_kpi_explanations() -> dict:
    return dict(_KPI_EXPLANATIONS)
