"""Bank Reconciliation Intelligence. Matches bank-statement credits to sales
invoices (collection verification) and debits to expenses, then reports how
much of the bank activity is reconciled. This turns the unused
reconciled_sale_id / reconciled_expense_id columns into real intelligence.

Matching is conservative: a bank credit matches a sale when the amounts are
equal (within a small tolerance) and the dates are close. Unmatched items are
surfaced so the owner can review. None-safe: returns {'available': False} when
there's no bank data.
"""
from datetime import timedelta
from decimal import Decimal

from app.db.models.bank_transaction import BankTransaction
from app.db.models.sale import Sale
from app.db.models.expense import Expense


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Decimal('0')


class BankReconciliationService:
    # Amount tolerance (rupees) and date window (days) for a confident match.
    AMOUNT_TOLERANCE = Decimal('1.00')
    DATE_WINDOW_DAYS = 7

    def __init__(self, session):
        self.session = session

    def has_bank_data(self, company_id) -> bool:
        return self.session.query(BankTransaction.id).filter(
            BankTransaction.company_id == company_id
        ).first() is not None

    def _bank_rows(self, company_id):
        return (
            self.session.query(BankTransaction)
            .filter(BankTransaction.company_id == company_id)
            .order_by(BankTransaction.transaction_date.asc())
            .all()
        )

    def reconcile(self, company_id, persist=True) -> dict:
        """Match credits→sales and debits→expenses. Optionally persists the
        links onto the bank rows. Returns a reconciliation summary."""
        bank = self._bank_rows(company_id)
        if not bank:
            return {'available': False, 'reason': 'Import a bank statement to reconcile against invoices.'}

        sales = (
            self.session.query(Sale)
            .filter(Sale.company_id == company_id)
            .all()
        )
        expenses = (
            self.session.query(Expense)
            .filter(Expense.company_id == company_id)
            .all()
        )

        # Track which sales/expenses are already claimed so two bank lines don't
        # both match the same invoice.
        claimed_sales = set()
        claimed_expenses = set()

        matched_credits = 0
        matched_debits = 0
        matched_credit_value = Decimal('0')
        matched_debit_value = Decimal('0')
        total_credit_value = Decimal('0')
        total_debit_value = Decimal('0')
        unmatched_credits = []
        unmatched_debits = []

        for tx in bank:
            credit = _d(tx.credit_amount)
            debit = _d(tx.debit_amount)

            if credit > 0:
                total_credit_value += credit
                match = self._find_match(credit, tx.transaction_date, sales, claimed_sales, 'invoice_date')
                if match is not None:
                    claimed_sales.add(match.id)
                    matched_credits += 1
                    matched_credit_value += credit
                    if persist:
                        tx.reconciled_sale_id = match.id
                else:
                    unmatched_credits.append({
                        'date': tx.transaction_date.isoformat() if tx.transaction_date else None,
                        'amount': float(credit),
                        'description': (tx.description or '')[:60],
                    })
            elif debit > 0:
                total_debit_value += debit
                match = self._find_match(debit, tx.transaction_date, expenses, claimed_expenses, 'incurred_date')
                if match is not None:
                    claimed_expenses.add(match.id)
                    matched_debits += 1
                    matched_debit_value += debit
                    if persist:
                        tx.reconciled_expense_id = match.id
                else:
                    unmatched_debits.append({
                        'date': tx.transaction_date.isoformat() if tx.transaction_date else None,
                        'amount': float(debit),
                        'description': (tx.description or '')[:60],
                    })

        if persist:
            try:
                self.session.commit()
            except Exception:
                self.session.rollback()

        credit_count = sum(1 for t in bank if _d(t.credit_amount) > 0)
        debit_count = sum(1 for t in bank if _d(t.debit_amount) > 0)
        match_rate = round((matched_credits + matched_debits) / len(bank) * 100, 1) if bank else 0.0

        return {
            'available': True,
            'total_transactions': len(bank),
            'match_rate_pct': match_rate,
            'credits': {
                'count': credit_count,
                'matched': matched_credits,
                'matched_value': float(matched_credit_value),
                'total_value': float(total_credit_value),
                'unmatched_value': float(total_credit_value - matched_credit_value),
            },
            'debits': {
                'count': debit_count,
                'matched': matched_debits,
                'matched_value': float(matched_debit_value),
                'total_value': float(total_debit_value),
                'unmatched_value': float(total_debit_value - matched_debit_value),
            },
            'unmatched_credits': sorted(unmatched_credits, key=lambda x: x['amount'], reverse=True)[:5],
            'unmatched_debits': sorted(unmatched_debits, key=lambda x: x['amount'], reverse=True)[:5],
            'insights': self._insights(matched_credits, credit_count, total_credit_value, matched_credit_value),
        }

    def _find_match(self, amount, tx_date, candidates, claimed, date_attr):
        """Find an unclaimed candidate whose amount matches within tolerance and
        whose date is within the window. Picks the closest date."""
        best = None
        best_gap = None
        for c in candidates:
            if c.id in claimed:
                continue
            if abs(_d(c.amount) - amount) > self.AMOUNT_TOLERANCE:
                continue
            c_date = getattr(c, date_attr, None)
            if tx_date is not None and c_date is not None:
                gap = abs((tx_date - c_date).days)
                if gap > self.DATE_WINDOW_DAYS:
                    continue
            else:
                gap = 999
            if best_gap is None or gap < best_gap:
                best = c
                best_gap = gap
        return best

    def _insights(self, matched_credits, credit_count, total_credit, matched_credit):
        out = []
        if credit_count > 0:
            verified_pct = round(matched_credits / credit_count * 100)
            if verified_pct >= 80:
                out.append({'label': 'Collections well verified', 'tone': 'good',
                            'detail': f'{verified_pct}% of bank deposits matched to invoices.'})
            elif verified_pct >= 40:
                out.append({'label': 'Partial collection verification', 'tone': 'neutral',
                            'detail': f'{verified_pct}% of deposits matched — review the rest.'})
            else:
                out.append({'label': 'Low collection verification', 'tone': 'bad',
                            'detail': f'Only {verified_pct}% of deposits matched to known invoices.'})
        unmatched = total_credit - matched_credit
        if unmatched > 0:
            out.append({'label': 'Unmatched deposits', 'tone': 'neutral',
                        'detail': f'₹{unmatched:,.0f} in deposits could not be tied to an invoice.'})
        return out

    # -- Daily AI Action Center contributions --------------------------------
    def actions(self, company_id) -> list:
        data = self.reconcile(company_id, persist=False)
        if not data.get('available'):
            return []
        out = []
        unmatched_val = data['credits']['unmatched_value']
        if unmatched_val > 0 and data['credits']['count'] > 0:
            matched = data['credits']['matched']
            count = data['credits']['count']
            if matched / count < 0.5:
                out.append({
                    'category': 'reconciliation', 'priority': 'medium',
                    'title': f'Reconcile ₹{unmatched_val:,.0f} of unmatched deposits',
                    'reason': 'Several bank deposits could not be matched to invoices — they may be unrecorded sales or need review.',
                    'expected_impact': 'Ensures your books match your bank and collections are verified.',
                    'recommended_action': 'Review unmatched deposits and record any missing invoices.',
                    'horizon': 'week',
                })
        return out
