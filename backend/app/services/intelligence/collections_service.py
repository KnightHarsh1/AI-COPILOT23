"""Collections Intelligence engine.

Computes everything the Collections widget shows: cash vs credit split,
outstanding receivables, aging buckets, collection efficiency, customer
dependency (revenue concentration), and a credit health score.

Honesty rule: sales imported before payment fields existed have
payment_status='unknown'. Those are reported as a separate "needs payment
data" count rather than silently treated as paid or overdue, so the widget
can prompt the owner to re-import with due dates instead of showing
misleading numbers.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.customer import Customer
from app.db.models.sale import Sale


def _f(value) -> float:
    if value is None:
        return 0.0
    return float(value)


class CollectionsIntelligenceService:
    def __init__(self, session: Session):
        self.session = session

    def analyze(self, company_id) -> dict:
        today = date.today()

        all_sales = self.session.query(Sale).filter(Sale.company_id == company_id).all()
        total_sales_count = len(all_sales)

        if total_sales_count == 0:
            return {
                'available': False,
                'reason': 'No sales data yet. Upload or import sales to unlock collections insights.',
            }

        known = [s for s in all_sales if s.payment_status in ('paid', 'unpaid', 'partial')]
        unknown_count = total_sales_count - len(known)

        if not known:
            return {
                'available': False,
                'reason': (
                    f'Payment data not available for any of your {total_sales_count} sales. '
                    'Re-import sales with due date and payment status columns to unlock collections insights.'
                ),
                'sales_missing_payment_data': unknown_count,
            }

        cash_sales = sum(_f(s.amount) for s in known if not s.is_credit_sale)
        credit_sales = sum(_f(s.amount) for s in known if s.is_credit_sale)

        billed = sum(_f(s.amount) for s in known)
        collected = sum(_f(s.amount_paid) for s in known)
        outstanding = max(0.0, billed - collected)
        collection_efficiency = round((collected / billed * 100), 1) if billed else 0.0

        # Aging buckets on the unpaid portion of each sale with a due date.
        buckets = {'current': 0.0, 'd1_30': 0.0, 'd31_60': 0.0, 'd61_90': 0.0, 'd90_plus': 0.0}
        for s in known:
            if s.payment_status == 'paid':
                continue
            unpaid = max(0.0, _f(s.amount) - _f(s.amount_paid))
            if unpaid <= 0:
                continue
            if s.due_date is None:
                buckets['current'] += unpaid
                continue
            days_overdue = (today - s.due_date).days
            if days_overdue <= 0:
                buckets['current'] += unpaid
            elif days_overdue <= 30:
                buckets['d1_30'] += unpaid
            elif days_overdue <= 60:
                buckets['d31_60'] += unpaid
            elif days_overdue <= 90:
                buckets['d61_90'] += unpaid
            else:
                buckets['d90_plus'] += unpaid

        # Customer dependency: revenue concentration of the top customer.
        customer_totals = (
            self.session.query(
                Sale.customer_id,
                func.coalesce(func.sum(Sale.amount), 0).label('total'),
            )
            .filter(Sale.company_id == company_id, Sale.customer_id.isnot(None))
            .group_by(Sale.customer_id)
            .order_by(func.sum(Sale.amount).desc())
            .all()
        )
        top_customer_share = 0.0
        top_customer_name = None
        if customer_totals and billed:
            top_id, top_total = customer_totals[0]
            total_with_customer = sum(_f(t) for _, t in customer_totals)
            if total_with_customer:
                top_customer_share = round(_f(top_total) / total_with_customer * 100, 1)
            top_customer = self.session.query(Customer).filter(Customer.id == top_id).one_or_none()
            top_customer_name = top_customer.name if top_customer else None

        overdue_total = buckets['d1_30'] + buckets['d31_60'] + buckets['d61_90'] + buckets['d90_plus']
        overdue_ratio = (overdue_total / outstanding) if outstanding else 0.0

        # Credit health score (0-100): efficiency rewards, overdue + heavy
        # concentration penalize. Deterministic, explainable.
        score = collection_efficiency
        score -= overdue_ratio * 30
        if top_customer_share > 40:
            score -= (top_customer_share - 40) * 0.5
        score = max(0.0, min(100.0, round(score, 1)))

        # Collection forecast: estimate how much of the outstanding is likely
        # to be collected in the next 30 days, weighting each aging bucket by a
        # realistic recovery likelihood (recent invoices collect far more
        # reliably than 90+ day-old ones), scaled by historical efficiency.
        eff_factor = (collection_efficiency / 100.0) if collection_efficiency else 0.7
        recovery_weights = {
            'current': 0.85, 'd1_30': 0.75, 'd31_60': 0.55, 'd61_90': 0.35, 'd90_plus': 0.15,
        }
        forecast_30d = 0.0
        for bucket, weight in recovery_weights.items():
            forecast_30d += buckets[bucket] * weight * eff_factor
        collection_forecast = {
            'expected_30d': round(forecast_30d, 2),
            'basis': 'Aging buckets weighted by recovery likelihood and your collection efficiency.',
        }

        # Days Sales Outstanding: how long, on average, money stays unpaid.
        # DSO = (outstanding / credit sales over period) × period days.
        dso = None
        if credit_sales > 0:
            dso = round((outstanding / credit_sales) * 90, 1)
        recovery_probability = round(min(100.0, eff_factor * 100), 1)

        return {
            'available': True,
            'cash_sales': round(cash_sales, 2),
            'credit_sales': round(credit_sales, 2),
            'total_billed': round(billed, 2),
            'total_collected': round(collected, 2),
            'outstanding_receivables': round(outstanding, 2),
            'collection_efficiency': collection_efficiency,
            'dso': dso,
            'recovery_probability': recovery_probability,
            'aging': {k: round(v, 2) for k, v in buckets.items()},
            'aging_labels': {'current': '0-30', 'd1_30': '0-30', 'd31_60': '31-60', 'd61_90': '61-90', 'd90_plus': '90+'},
            'overdue_total': round(overdue_total, 2),
            'top_customer_name': top_customer_name,
            'top_customer_share': top_customer_share,
            'credit_health_score': score,
            'collection_forecast': collection_forecast,
            'sales_missing_payment_data': unknown_count,
        }
