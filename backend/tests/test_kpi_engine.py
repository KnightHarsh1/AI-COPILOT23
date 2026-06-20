import uuid
from datetime import date, timedelta
from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.services.kpi_engine import KPIService


def _add_sale(session, company, days_ago, amount, paid=None, status='paid'):
    session.add(Sale(company_id=company.id, invoice_date=date.today() - timedelta(days=days_ago),
                     amount=amount, category='X', payment_status=status,
                     amount_paid=paid if paid is not None else amount))
    session.commit()


def test_kpi_windows_around_actual_data(session, company):
    # Historical data far in the past must still be picked up.
    session.add(Sale(company_id=company.id, invoice_date=date(2024, 9, 1), amount=1000, category='X',
                     payment_status='paid', amount_paid=1000))
    session.commit()
    kpis = KPIService(session).calculate_kpis(company.id)
    assert kpis['revenue'] == 1000
    assert kpis['period_end'].year == 2024


def test_cash_and_receivable_kpis(session, company):
    _add_sale(session, company, 5, 1000, paid=1000, status='paid')
    _add_sale(session, company, 5, 1000, paid=0, status='unpaid')
    kpis = KPIService(session).calculate_kpis(company.id)
    assert kpis['outstanding_receivables'] == 1000
    assert kpis['receivable_days'] >= 0


def test_no_data_is_safe(session, company):
    kpis = KPIService(session).calculate_kpis(company.id)
    assert kpis['revenue'] == 0
    assert kpis['net_profit'] == 0
