"""Customer Intelligence — derives customer-level insights from sales data
(which now carries customer_name, amount, dates, and payment status). Produces
the Customer Health Score, top customers, concentration/dependency risk,
fast-growing / lost / new customers, repeat-purchase analysis, lifetime value,
segmentation, and customer alerts.

All data-gated: every figure comes from real Sale rows. Returns
{'available': False} when there's no customer-attributed sales data, so the
Command Center hides the section instead of fabricating customers.
"""
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func

from app.db.models.sale import Sale


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Decimal('0')


class CustomerIntelligenceService:
    def __init__(self, session):
        self.session = session

    def _sales(self, company_id):
        return (
            self.session.query(Sale)
            .filter(Sale.company_id == company_id, Sale.customer_name.isnot(None))
            .all()
        )

    def has_customer_data(self, company_id) -> bool:
        return self.session.query(Sale.id).filter(
            Sale.company_id == company_id, Sale.customer_name.isnot(None)
        ).first() is not None

    def analyze(self, company_id) -> dict:
        sales = self._sales(company_id)
        if not sales:
            return {'available': False, 'reason': 'No customer-attributed sales yet. Import a Sales Register with a customer column.'}

        today = date.today()
        recent_cut = today - timedelta(days=90)
        prev_cut = today - timedelta(days=180)

        # Aggregate per customer.
        agg = defaultdict(lambda: {
            'revenue': Decimal('0'), 'orders': 0, 'outstanding': Decimal('0'),
            'first': None, 'last': None,
            'recent_rev': Decimal('0'), 'prev_rev': Decimal('0'),
        })
        total_revenue = Decimal('0')
        for s in sales:
            name = (s.customer_name or '').strip()
            if not name:
                continue
            a = agg[name]
            amt = _d(s.amount)
            a['revenue'] += amt
            a['orders'] += 1
            total_revenue += amt
            # outstanding = amount - amount_paid for credit/unpaid
            paid = _d(s.amount_paid)
            if (s.payment_status or 'unknown') in ('unpaid', 'partial', 'unknown'):
                a['outstanding'] += max(amt - paid, Decimal('0'))
            d = s.invoice_date
            if d:
                if a['first'] is None or d < a['first']:
                    a['first'] = d
                if a['last'] is None or d > a['last']:
                    a['last'] = d
                if d >= recent_cut:
                    a['recent_rev'] += amt
                elif d >= prev_cut:
                    a['prev_rev'] += amt

        customer_count = len(agg)
        if customer_count == 0 or total_revenue == 0:
            return {'available': False, 'reason': 'No customer revenue to analyse yet.'}

        # Build per-customer view.
        customers = []
        for name, a in agg.items():
            rev = a['revenue']
            share = float(rev / total_revenue * 100) if total_revenue else 0.0
            # growth: recent 90d vs prior 90d
            growth = None
            if a['prev_rev'] > 0:
                growth = float((a['recent_rev'] - a['prev_rev']) / a['prev_rev'] * 100)
            days_since_last = (today - a['last']).days if a['last'] else None
            customers.append({
                'name': name,
                'revenue': float(rev),
                'orders': a['orders'],
                'share_pct': round(share, 1),
                'outstanding': float(a['outstanding']),
                'avg_order_value': float(rev / a['orders']) if a['orders'] else 0.0,
                'growth_pct': round(growth, 1) if growth is not None else None,
                'days_since_last_order': days_since_last,
                'first_order': a['first'].isoformat() if a['first'] else None,
                'last_order': a['last'].isoformat() if a['last'] else None,
                'is_repeat': a['orders'] > 1,
            })

        customers.sort(key=lambda c: c['revenue'], reverse=True)

        # Top customers.
        top_customers = customers[:8]

        # Concentration: share of top customer + top 3 (HHI-style risk).
        top_share = customers[0]['share_pct'] if customers else 0
        top3_share = round(sum(c['share_pct'] for c in customers[:3]), 1)

        # Dependency risk band.
        if top_share >= 50:
            dependency = {'level': 'high', 'detail': f'{customers[0]["name"]} alone is {top_share:.0f}% of revenue.'}
        elif top_share >= 30:
            dependency = {'level': 'medium', 'detail': f'Top customer is {top_share:.0f}% of revenue.'}
        else:
            dependency = {'level': 'low', 'detail': f'Revenue is well spread — top customer is {top_share:.0f}%.'}

        # Fast growing (growth >= 25%, recent activity).
        fast_growing = sorted(
            [c for c in customers if c['growth_pct'] is not None and c['growth_pct'] >= 25],
            key=lambda c: c['growth_pct'], reverse=True
        )[:5]

        # Declining (growth <= -25%).
        declining = sorted(
            [c for c in customers if c['growth_pct'] is not None and c['growth_pct'] <= -25],
            key=lambda c: c['growth_pct']
        )[:5]

        # Lost: no order in 120+ days but had history.
        lost = [c for c in customers if c['days_since_last_order'] is not None and c['days_since_last_order'] >= 120]
        lost.sort(key=lambda c: c['revenue'], reverse=True)

        # New: first order within 90 days.
        new_customers = [c for c in customers if c['first_order'] and date.fromisoformat(c['first_order']) >= recent_cut]
        new_customers.sort(key=lambda c: c['revenue'], reverse=True)

        # Repeat purchase analysis.
        repeat_count = sum(1 for c in customers if c['is_repeat'])
        repeat_rate = round(repeat_count / customer_count * 100, 1) if customer_count else 0.0

        # Customer lifetime value (simple): avg revenue per customer.
        avg_ltv = float(total_revenue / customer_count) if customer_count else 0.0

        # Segmentation by revenue tier.
        segments = self._segment(customers, total_revenue)

        # Customer health score (0-100): blends diversification, repeat rate,
        # collection health and retention (few lost).
        health = self._customer_health(top_share, repeat_rate, customers, lost, total_revenue)

        return {
            'available': True,
            'customer_count': customer_count,
            'total_revenue': float(total_revenue),
            'customer_health_score': health,
            'top_customers': top_customers,
            'concentration': {'top_customer_pct': top_share, 'top3_pct': top3_share},
            'dependency_risk': dependency,
            'fast_growing': fast_growing,
            'declining': declining,
            'lost_customers': lost[:5],
            'new_customers': new_customers[:5],
            'repeat_analysis': {'repeat_customers': repeat_count, 'repeat_rate_pct': repeat_rate, 'one_time': customer_count - repeat_count},
            'avg_lifetime_value': round(avg_ltv, 2),
            'segments': segments,
            'alerts': self._alerts(customers, lost, declining, fast_growing, dependency),
        }

    def _segment(self, customers, total_revenue):
        """Split into VIP / regular / occasional by revenue contribution."""
        vip, regular, occasional = [], [], []
        for c in customers:
            if c['share_pct'] >= 10:
                vip.append(c['name'])
            elif c['share_pct'] >= 2:
                regular.append(c['name'])
            else:
                occasional.append(c['name'])
        return [
            {'segment': 'VIP', 'count': len(vip), 'desc': '≥10% of revenue each'},
            {'segment': 'Regular', 'count': len(regular), 'desc': '2–10% of revenue each'},
            {'segment': 'Occasional', 'count': len(occasional), 'desc': '<2% of revenue each'},
        ]

    def _customer_health(self, top_share, repeat_rate, customers, lost, total_revenue):
        # Diversification (lower top share is better): 0..40
        div = max(0.0, 40.0 - (top_share / 100 * 40))
        # Repeat rate: 0..30
        rep = repeat_rate / 100 * 30
        # Retention (fewer lost is better): 0..20
        lost_rev = sum(Decimal(str(c['revenue'])) for c in lost)
        lost_ratio = float(lost_rev / total_revenue) if total_revenue else 0
        ret = max(0.0, 20.0 - lost_ratio * 20)
        # Collection (low outstanding share): 0..10
        outstanding = sum(Decimal(str(c['outstanding'])) for c in customers)
        out_ratio = float(outstanding / total_revenue) if total_revenue else 0
        coll = max(0.0, 10.0 - out_ratio * 10)
        score = round(div + rep + ret + coll)
        return max(0, min(100, score))

    def _alerts(self, customers, lost, declining, fast_growing, dependency):
        """Customer Alerts Meter — counts + sample per alert type."""
        overdue = [c for c in customers if c['outstanding'] > 0]
        overdue.sort(key=lambda c: c['outstanding'], reverse=True)
        credit_risk = [c for c in customers if c['outstanding'] > 0 and (c['days_since_last_order'] or 0) > 60]

        def pack(items, value_key=None):
            return [{'name': c['name'], 'value': c.get(value_key) if value_key else None} for c in items[:5]]

        return {
            'overdue': {'count': len(overdue), 'items': pack(overdue, 'outstanding')},
            'declining': {'count': len(declining), 'items': pack(declining, 'growth_pct')},
            'lost': {'count': len(lost), 'items': pack(lost, 'revenue')},
            'high_dependency': {'count': 1 if dependency['level'] == 'high' else 0,
                                'items': [{'name': customers[0]['name'], 'value': customers[0]['share_pct']}] if (customers and dependency['level'] == 'high') else []},
            'fast_growing': {'count': len(fast_growing), 'items': pack(fast_growing, 'growth_pct')},
            'credit_risk': {'count': len(credit_risk), 'items': pack(credit_risk, 'outstanding')},
        }

    # -- Daily AI Action Center contributions --------------------------------
    def actions(self, company_id) -> list:
        """Customer-related entries for the Daily AI Action Center."""
        data = self.analyze(company_id)
        if not data.get('available'):
            return []
        out = []

        # Overdue follow-ups (highest outstanding first).
        for c in data['alerts']['overdue']['items'][:3]:
            if c['value'] and c['value'] > 0:
                out.append({
                    'category': 'collections', 'priority': 'high',
                    'title': f'Follow up {c["name"]}',
                    'reason': f'₹{c["value"]:,.0f} outstanding from this customer.',
                    'expected_impact': 'Recovers cash and reduces credit risk.',
                    'recommended_action': f'Call or email {c["name"]} to collect the outstanding balance.',
                    'horizon': 'today',
                })

        # Declining customers.
        for c in data['declining'][:2]:
            out.append({
                'category': 'customer_risk', 'priority': 'medium',
                'title': f'{c["name"]} revenue down {abs(c["growth_pct"]):.0f}%',
                'reason': 'This customer is buying significantly less than the prior period.',
                'expected_impact': 'Protects an at-risk revenue stream.',
                'recommended_action': f'Reach out to {c["name"]} to understand the drop and re-engage.',
                'horizon': 'week',
            })

        # Fast-growing → expansion opportunity.
        for c in data['fast_growing'][:2]:
            out.append({
                'category': 'opportunity', 'priority': 'medium',
                'title': f'{c["name"]} growing {c["growth_pct"]:.0f}%',
                'reason': 'This customer is rapidly increasing purchases — a potential expansion opportunity.',
                'expected_impact': 'Grows revenue from an already-engaged customer.',
                'recommended_action': f'Offer {c["name"]} a volume deal or introduce complementary products.',
                'horizon': 'week',
            })

        # High dependency.
        dep = data['dependency_risk']
        if dep['level'] == 'high':
            out.append({
                'category': 'customer_risk', 'priority': 'high',
                'title': 'High customer dependency',
                'reason': dep['detail'],
                'expected_impact': 'Reduces the risk of a single customer loss hurting the business.',
                'recommended_action': 'Diversify by acquiring new customers in the same segment.',
                'horizon': 'month',
            })
        return out
