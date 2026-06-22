"""Opportunity Intelligence — the cross-engine opportunity finder. It reads
the outputs of the customer, product, collections, and cash/expense engines
and surfaces concrete, money-quantified opportunities a business owner can act
on: growing customers to expand, dead stock to liquidate, receivables to
recover, top products to push, and cost lines to optimise.

Every opportunity is data-gated — it only appears when the underlying engine
has real data supporting it. Returns {'available': False} when no opportunities
can be derived yet.
"""
from decimal import Decimal


def _opp(category, title, detail, value, action, potential=None):
    return {
        'category': category,        # growth | product | customer | collections | cost | expansion
        'title': title,
        'detail': detail,
        'value': value,              # rupee figure when known, else None
        'potential': potential,      # short label e.g. "Recover cash"
        'recommended_action': action,
    }


class OpportunityIntelligenceService:
    def __init__(self, session):
        self.session = session

    def analyze(self, company_id) -> dict:
        opportunities = []

        customer = self._safe(lambda: self._customer(company_id))
        product = self._safe(lambda: self._product(company_id))
        collections = self._safe(lambda: self._collections(company_id))
        cost = self._safe(lambda: self._cost(company_id))

        for group in (customer, product, collections, cost):
            opportunities.extend(group or [])

        if not opportunities:
            return {'available': False, 'reason': 'Import more business data to surface growth and recovery opportunities.'}

        # Rank: ones with a quantified rupee value first, by size.
        opportunities.sort(key=lambda o: (o['value'] is None, -(o['value'] or 0)))

        # Total quantified opportunity value.
        total_value = sum(o['value'] for o in opportunities if o['value'])

        by_category = {}
        for o in opportunities:
            by_category.setdefault(o['category'], 0)
            by_category[o['category']] += 1

        return {
            'available': True,
            'opportunity_count': len(opportunities),
            'total_value': round(total_value, 2),
            'by_category': by_category,
            'opportunities': opportunities[:12],
        }

    def _safe(self, fn):
        try:
            return fn()
        except Exception:
            return []

    # -- Customer opportunities (growing customers → expansion) --------------
    def _customer(self, company_id):
        from app.services.intelligence.customer_intelligence_service import CustomerIntelligenceService
        data = CustomerIntelligenceService(self.session).analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        for c in data.get('fast_growing', [])[:3]:
            out.append(_opp(
                'customer',
                f'Expand with {c["name"]}',
                f'This customer grew {c["growth_pct"]:.0f}% recently — a strong expansion candidate.',
                c.get('revenue'),
                f'Offer {c["name"]} a volume deal or cross-sell complementary products.',
                'Grow revenue',
            ))
        return out

    # -- Product opportunities (dead stock liquidation, best-seller push) ----
    def _product(self, company_id):
        from app.services.intelligence.product_service import ProductIntelligenceService
        data = ProductIntelligenceService(self.session).analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        dead_value = data.get('dead_stock_value', 0)
        if dead_value and dead_value > 0:
            out.append(_opp(
                'product',
                f'Liquidate ₹{dead_value:,.0f} of dead stock',
                f'{len(data.get("dead_stock", []))} product(s) haven\'t sold in 90+ days — cash is locked up.',
                dead_value,
                'Run a clearance sale or bundle the slow movers.',
                'Free up cash',
            ))
        for p in data.get('best_sellers', [])[:2]:
            out.append(_opp(
                'product',
                f'Scale up {p["product_name"]}',
                'One of your best-selling products — there may be room to grow volume.',
                p.get('revenue'),
                f'Ensure {p["product_name"]} stays in stock and promote it.',
                'Grow revenue',
            ))
        return out

    # -- Collection opportunities (recover receivables) ----------------------
    def _collections(self, company_id):
        from app.services.intelligence.collections_service import CollectionsIntelligenceService
        data = CollectionsIntelligenceService(self.session).analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        outstanding = data.get('outstanding_receivables', 0)
        if outstanding and outstanding > 0:
            out.append(_opp(
                'collections',
                f'Recover ₹{outstanding:,.0f} in receivables',
                'Outstanding invoices represent cash you have already earned.',
                outstanding,
                'Prioritise follow-ups on the largest overdue balances.',
                'Recover cash',
            ))
        return out

    # -- Cost optimisation (largest expense / spending lines) ----------------
    def _cost(self, company_id):
        from app.services.cash_flow_service import CashFlowService
        cf = CashFlowService(self.session)
        out = []
        if cf.has_bank_data(company_id):
            spending = cf.spending_breakdown(company_id, top_n=1)
            if spending:
                top = spending[0]
                out.append(_opp(
                    'cost',
                    f'Review spending on {top["label"]}',
                    f'{top["label"]} is your largest cash outflow at ₹{top["amount"]:,.0f}.',
                    top['amount'],
                    f'Negotiate or consolidate {top["label"]} to reduce costs.',
                    'Cut costs',
                ))
        return out

    # -- Daily AI Action Center contributions --------------------------------
    def actions(self, company_id) -> list:
        data = self.analyze(company_id)
        if not data.get('available'):
            return []
        out = []
        for o in data['opportunities'][:4]:
            out.append({
                'category': 'opportunity',
                'priority': 'medium',
                'title': o['title'],
                'reason': o['detail'],
                'expected_impact': o.get('potential') or 'Improves business performance.',
                'recommended_action': o['recommended_action'],
                'horizon': 'week',
            })
        return out
