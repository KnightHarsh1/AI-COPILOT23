from sqlalchemy import extract, func

from app.db.models.sale import Sale
from app.db.models.expense import Expense

MONTH_LABELS = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12',
]


class ChartService:
    """Builds simple month-bucketed chart series, scoped to a single company.

    Uses SQLAlchemy's `extract('month', ...)` instead of SQLite-only
    `strftime` so the same code works against Postgres in production and
    SQLite in local development.
    """

    def __init__(self, session):
        self.session = session

    def _monthly_series(self, model, date_column, amount_column, company_id):
        rows = (
            self.session.query(
                extract('month', date_column).label('month'),
                func.coalesce(func.sum(amount_column), 0).label('total'),
            )
            .filter(model.company_id == company_id)
            .group_by('month')
            .order_by('month')
            .all()
        )

        totals_by_month = {int(month): float(total) for month, total in rows if month is not None}

        return [
            {
                'label': MONTH_LABELS[month_number - 1],
                'value': totals_by_month.get(month_number, 0.0),
            }
            for month_number in range(1, 13)
            if month_number in totals_by_month
        ]

    def revenue_chart(self, company_id):
        return self._monthly_series(Sale, Sale.invoice_date, Sale.amount, company_id)

    def expense_chart(self, company_id):
        return self._monthly_series(Expense, Expense.incurred_date, Expense.amount, company_id)

    def profit_chart(self, company_id):
        revenue_by_month = {item['label']: item['value'] for item in self.revenue_chart(company_id)}
        expense_by_month = {item['label']: item['value'] for item in self.expense_chart(company_id)}

        months = sorted(set(revenue_by_month) | set(expense_by_month))
        return [
            {
                'label': month,
                'value': revenue_by_month.get(month, 0.0) - expense_by_month.get(month, 0.0),
            }
            for month in months
        ]

    def health_score_chart(self, company_id):
        revenue = self.revenue_chart(company_id)
        return [
            {
                'label': item['label'],
                'value': min(round(item['value'] / 10000), 100) if item['value'] else 0,
            }
            for item in revenue
        ]
