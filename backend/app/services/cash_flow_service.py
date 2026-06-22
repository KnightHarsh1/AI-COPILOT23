"""Cash Flow Intelligence from imported bank statements. Reads BankTransaction
rows (credit/debit/balance) and derives cash position, inflow vs outflow, net
cash flow, the cash-flow trend, and a simple spending breakdown. Independent of
Sales/Expense logic. None-safe: returns {'available': False} when no bank data
has been uploaded so the Command Center hides the section instead of showing
fabricated zeros.
"""
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import func

from app.db.models.bank_transaction import BankTransaction


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Decimal('0')


class CashFlowService:
    def __init__(self, session):
        self.session = session

    def has_bank_data(self, company_id) -> bool:
        return self.session.query(BankTransaction.id).filter(
            BankTransaction.company_id == company_id
        ).first() is not None

    def _rows(self, company_id):
        return (
            self.session.query(BankTransaction)
            .filter(BankTransaction.company_id == company_id)
            .order_by(BankTransaction.transaction_date.asc())
            .all()
        )

    def summary(self, company_id) -> dict:
        rows = self._rows(company_id)
        if not rows:
            return {'available': False}

        inflow = sum((_d(r.credit_amount) for r in rows), Decimal('0'))
        outflow = sum((_d(r.debit_amount) for r in rows), Decimal('0'))
        net = inflow - outflow

        # Latest known balance = balance_after of the most recent dated row that
        # carries one. This is the truest "cash position" we can show.
        latest_balance = None
        for r in reversed(rows):
            if r.balance_after is not None:
                latest_balance = _d(r.balance_after)
                break

        first_date = rows[0].transaction_date
        last_date = rows[-1].transaction_date
        txn_count = len(rows)

        return {
            'available': True,
            'cash_position': float(latest_balance) if latest_balance is not None else None,
            'total_inflow': float(inflow),
            'total_outflow': float(outflow),
            'net_cash_flow': float(net),
            'transaction_count': txn_count,
            'period_start': first_date.isoformat() if first_date else None,
            'period_end': last_date.isoformat() if last_date else None,
        }

    def monthly_trend(self, company_id) -> list:
        """Inflow/outflow/net per month for a cash-flow chart."""
        rows = self._rows(company_id)
        if not rows:
            return []
        buckets = defaultdict(lambda: {'inflow': Decimal('0'), 'outflow': Decimal('0')})
        for r in rows:
            key = r.transaction_date.strftime('%Y-%m') if r.transaction_date else 'unknown'
            buckets[key]['inflow'] += _d(r.credit_amount)
            buckets[key]['outflow'] += _d(r.debit_amount)
        out = []
        for key in sorted(buckets):
            b = buckets[key]
            out.append({
                'month': key,
                'inflow': float(b['inflow']),
                'outflow': float(b['outflow']),
                'net': float(b['inflow'] - b['outflow']),
            })
        return out

    def spending_breakdown(self, company_id, top_n=6) -> list:
        """Largest outflow destinations, parsed from narration. Best-effort —
        groups by the cleaned description so an owner sees where cash goes."""
        rows = self._rows(company_id)
        spend = defaultdict(Decimal)
        for r in rows:
            d = _d(r.debit_amount)
            if d <= 0:
                continue
            label = (r.category or self._counterparty(r.description) or 'Other')
            spend[label] += d
        ranked = sorted(spend.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
        return [{'label': k, 'amount': float(v)} for k, v in ranked]

    @staticmethod
    def _counterparty(description):
        if not description:
            return None
        text = str(description).strip()
        # Strip common bank prefixes to get the counterparty name.
        for prefix in ('UPI DR ', 'UPI CR ', 'NEFT DR ', 'NEFT CR ', 'IMPS ', 'UPI ', 'NEFT ', 'ACH ', 'POS '):
            if text.upper().startswith(prefix):
                text = text[len(prefix):]
        return text[:40] if text else None

    def kpis(self, company_id) -> dict:
        s = self.summary(company_id)
        if not s.get('available'):
            return {'available': False}
        return {
            'available': True,
            'cash_position': s['cash_position'],
            'net_cash_flow': s['net_cash_flow'],
            'total_inflow': s['total_inflow'],
            'total_outflow': s['total_outflow'],
        }

    def insights(self, company_id) -> list:
        s = self.summary(company_id)
        if not s.get('available'):
            return []
        out = []
        net = s['net_cash_flow']
        if net > 0:
            out.append({'label': 'Positive cash flow', 'tone': 'good',
                        'detail': f'Inflows exceeded outflows by ₹{net:,.0f} over the period.'})
        elif net < 0:
            out.append({'label': 'Negative cash flow', 'tone': 'bad',
                        'detail': f'Outflows exceeded inflows by ₹{abs(net):,.0f} — watch your runway.'})
        if s.get('cash_position') is not None:
            tone = 'good' if s['cash_position'] > 0 else 'bad'
            out.append({'label': 'Cash position', 'tone': tone,
                        'detail': f'Latest bank balance is approximately ₹{s["cash_position"]:,.0f}.'})
        top = self.spending_breakdown(company_id, top_n=1)
        if top:
            out.append({'label': 'Largest outflow', 'tone': 'neutral',
                        'detail': f'{top[0]["label"]} accounted for ₹{top[0]["amount"]:,.0f}.'})
        return out
