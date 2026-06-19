from datetime import date, timedelta

from sqlalchemy import extract, func

from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.db.models.metric import Metric

MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]


class ChartService:
    """Builds chart series scoped to a single company.

    Uses SQLAlchemy's `extract('month', ...)` instead of SQLite-only
    `strftime` so the same code works against Postgres in production and
    SQLite in local development.
    """

    def __init__(self, session):
        self.session = session

    def _monthly_series(self, model, date_column, amount_column, company_id):
        rows = (
            self.session.query(
                extract('year', date_column).label('year'),
                extract('month', date_column).label('month'),
                func.coalesce(func.sum(amount_column), 0).label('total'),
            )
            .filter(model.company_id == company_id)
            .group_by('year', 'month')
            .order_by('year', 'month')
            .all()
        )

        return [
            {
                'label': f"{MONTH_LABELS[int(month) - 1]} {str(int(year))[2:]}",
                'value': float(total),
            }
            for year, month, total in rows
            if month is not None
        ]

    def revenue_chart(self, company_id):
        return self._monthly_series(Sale, Sale.invoice_date, Sale.amount, company_id)

    def expense_chart(self, company_id):
        """Expense breakdown grouped by CATEGORY (not month) -- this is what
        a pie/breakdown chart should show. Falls back to 'Uncategorized'
        for rows with no category."""
        rows = (
            self.session.query(
                func.coalesce(Expense.category, 'Uncategorized').label('category'),
                func.coalesce(func.sum(Expense.amount), 0).label('total'),
            )
            .filter(Expense.company_id == company_id)
            .group_by('category')
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )
        return [{'label': str(category), 'value': float(total)} for category, total in rows]

    def expense_trend_chart(self, company_id):
        """Month-bucketed expense totals, for a time-series view."""
        return self._monthly_series(Expense, Expense.incurred_date, Expense.amount, company_id)

    def profit_chart(self, company_id):
        revenue_rows = self._monthly_series(Sale, Sale.invoice_date, Sale.amount, company_id)
        expense_rows = self._monthly_series(Expense, Expense.incurred_date, Expense.amount, company_id)

        revenue_by_month = {item['label']: item['value'] for item in revenue_rows}
        expense_by_month = {item['label']: item['value'] for item in expense_rows}

        all_labels = list(dict.fromkeys([*revenue_by_month, *expense_by_month]))
        return [
            {
                'label': label,
                'value': revenue_by_month.get(label, 0.0) - expense_by_month.get(label, 0.0),
            }
            for label in all_labels
        ]

    def revenue_vs_expense_chart(self, company_id):
        """Combined series with revenue, expense, and profit per month --
        powers a grouped/composed chart that's far more useful than three
        separate single-series charts."""
        revenue_rows = self._monthly_series(Sale, Sale.invoice_date, Sale.amount, company_id)
        expense_rows = self._monthly_series(Expense, Expense.incurred_date, Expense.amount, company_id)

        revenue_by_month = {item['label']: item['value'] for item in revenue_rows}
        expense_by_month = {item['label']: item['value'] for item in expense_rows}

        all_labels = list(dict.fromkeys([*revenue_by_month, *expense_by_month]))
        return [
            {
                'label': label,
                'revenue': revenue_by_month.get(label, 0.0),
                'expense': expense_by_month.get(label, 0.0),
                'profit': revenue_by_month.get(label, 0.0) - expense_by_month.get(label, 0.0),
            }
            for label in all_labels
        ]

    def health_score_chart(self, company_id):
        """REAL health-score history from the metrics table (previously this
        was a fake revenue/10000 proxy). Each persisted health_score metric
        becomes one point on the trend line."""
        rows = (
            self.session.query(Metric)
            .filter(Metric.company_id == company_id, Metric.name == 'health_score')
            .order_by(Metric.period_end)
            .all()
        )

        if not rows:
            return []

        return [
            {
                'label': f"{MONTH_LABELS[m.period_end.month - 1]} {str(m.period_end.year)[2:]}",
                'value': round(float(m.value), 1),
            }
            for m in rows
        ]
