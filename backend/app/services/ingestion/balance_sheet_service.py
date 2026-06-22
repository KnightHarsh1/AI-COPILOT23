"""Dedicated Balance Sheet pipeline. Reads the latest balance-sheet
FinancialStatementLine rows (committed by the importer) and derives the
balance-sheet figures and KPIs — completely independent of Sales/Expense
logic. Returns None-safe results so the Command Center degrades gracefully
when no balance sheet has been uploaded.
"""
from decimal import Decimal

from sqlalchemy import func

from app.db.models.financial_statement import FinancialStatementLine


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Decimal('0')


class BalanceSheetService:
    # Which line_category values roll up into each balance-sheet bucket.
    CASH = {'cash_and_bank'}
    RECEIVABLES = {'receivables'}
    INVENTORY = {'inventory_assets'}
    CURRENT_ASSETS = {'cash_and_bank', 'receivables', 'inventory_assets', 'current_assets'}
    FIXED_ASSETS = {'fixed_assets'}
    PAYABLES = {'payables'}
    CURRENT_LIABILITIES = {'payables', 'current_liabilities'}
    LONG_TERM_LIABILITIES = {'long_term_liabilities'}
    EQUITY = {'equity'}

    def __init__(self, session):
        self.session = session

    def latest_date(self, company_id):
        return self.session.query(func.max(FinancialStatementLine.statement_date)).filter(
            FinancialStatementLine.company_id == company_id,
            FinancialStatementLine.statement_type == 'balance_sheet',
        ).scalar()

    def has_balance_sheet(self, company_id) -> bool:
        return self.latest_date(company_id) is not None

    def _sum(self, company_id, statement_date, categories) -> Decimal:
        total = self.session.query(func.coalesce(func.sum(FinancialStatementLine.amount), 0)).filter(
            FinancialStatementLine.company_id == company_id,
            FinancialStatementLine.statement_type == 'balance_sheet',
            FinancialStatementLine.statement_date == statement_date,
            FinancialStatementLine.line_category.in_(categories),
        ).scalar()
        return _d(total)

    def figures(self, company_id) -> dict:
        """The raw balance-sheet buckets. Returns {'available': False} when no
        balance sheet exists, so callers never show fabricated zeros."""
        sd = self.latest_date(company_id)
        if sd is None:
            return {'available': False}

        cash = self._sum(company_id, sd, self.CASH)
        receivables = self._sum(company_id, sd, self.RECEIVABLES)
        inventory = self._sum(company_id, sd, self.INVENTORY)
        current_assets = self._sum(company_id, sd, self.CURRENT_ASSETS)
        fixed_assets = self._sum(company_id, sd, self.FIXED_ASSETS)
        payables = self._sum(company_id, sd, self.PAYABLES)
        current_liabilities = self._sum(company_id, sd, self.CURRENT_LIABILITIES)
        long_term = self._sum(company_id, sd, self.LONG_TERM_LIABILITIES)
        equity = self._sum(company_id, sd, self.EQUITY)

        total_assets = current_assets + fixed_assets
        total_liabilities = current_liabilities + long_term

        return {
            'available': True,
            'statement_date': sd.isoformat() if sd else None,
            'cash': float(cash),
            'receivables': float(receivables),
            'inventory': float(inventory),
            'current_assets': float(current_assets),
            'fixed_assets': float(fixed_assets),
            'total_assets': float(total_assets),
            'payables': float(payables),
            'current_liabilities': float(current_liabilities),
            'long_term_liabilities': float(long_term),
            'total_liabilities': float(total_liabilities),
            'equity': float(equity),
        }

    def kpis(self, company_id) -> dict:
        """Balance-sheet KPIs. Independent of revenue. Returns
        {'available': False} when no balance sheet has been uploaded."""
        f = self.figures(company_id)
        if not f.get('available'):
            return {'available': False}

        cash = _d(f['cash'])
        receivables = _d(f['receivables'])
        inventory = _d(f['inventory'])
        current_assets = _d(f['current_assets'])
        current_liabilities = _d(f['current_liabilities'])
        total_assets = _d(f['total_assets'])
        total_liabilities = _d(f['total_liabilities'])
        equity = _d(f['equity'])

        # If cash wasn't separately categorised, fall back to current_assets
        # minus the parts we did identify (so a "Cash & Bank Balance" line that
        # landed in current_assets still surfaces a sensible cash figure).
        cash_position = cash if cash > 0 else max(
            current_assets - receivables - inventory, Decimal('0')
        )

        working_capital = current_assets - current_liabilities
        current_ratio = (current_assets / current_liabilities) if current_liabilities > 0 else None
        quick_ratio = ((current_assets - inventory) / current_liabilities) if current_liabilities > 0 else None
        debt_ratio = (total_liabilities / total_assets) if total_assets > 0 else None
        net_worth = total_assets - total_liabilities

        # Liquidity score 0-100 from current ratio (1.0 ok, 2.0+ strong).
        if current_ratio is None:
            liquidity_score = None
        else:
            liquidity_score = float(max(Decimal('0'), min(Decimal('100'), current_ratio * Decimal('50'))))

        # Financial strength 0-100: blends low leverage + positive net worth.
        strength = None
        if total_assets > 0:
            leverage_health = max(Decimal('0'), (Decimal('1') - (total_liabilities / total_assets))) * Decimal('100')
            strength = float(max(Decimal('0'), min(Decimal('100'), leverage_health)))

        def fnum(x):
            return float(round(x, 2)) if x is not None else None

        return {
            'available': True,
            'statement_date': f['statement_date'],
            'cash_position': fnum(cash_position),
            'working_capital': fnum(working_capital),
            'current_ratio': fnum(current_ratio),
            'quick_ratio': fnum(quick_ratio),
            'debt_ratio': fnum(debt_ratio),
            'liquidity_score': fnum(Decimal(str(liquidity_score)) if liquidity_score is not None else None),
            'financial_strength_score': fnum(Decimal(str(strength)) if strength is not None else None),
            'net_worth': fnum(net_worth),
        }

    def readiness(self, company_id) -> dict:
        """Balance-sheet-specific readiness: coverage of the balance-sheet
        areas, NOT revenue/expense/customer/date coverage."""
        f = self.figures(company_id)
        if not f.get('available'):
            return {
                'available': False,
                'reason': 'Upload a balance sheet to see financial-strength readiness.',
            }

        def covered(v):
            return 100 if _d(v) != 0 else 0

        areas = [
            {'label': 'Assets', 'pct': covered(f['total_assets'])},
            {'label': 'Liabilities', 'pct': covered(f['total_liabilities'])},
            {'label': 'Cash', 'pct': covered(f['cash']) or covered(f['current_assets'])},
            {'label': 'Receivables', 'pct': covered(f['receivables'])},
            {'label': 'Inventory', 'pct': covered(f['inventory'])},
            {'label': 'Loans / liabilities', 'pct': covered(f['long_term_liabilities']) or covered(f['current_liabilities'])},
        ]
        score = round(sum(a['pct'] for a in areas) / len(areas))
        return {
            'available': True,
            'score': score,
            'areas': areas,
            'forecast_confidence': 'n/a',
            'ai_confidence': 'High' if score >= 60 else 'Medium' if score >= 30 else 'Low',
        }

    def insights(self, company_id) -> list:
        """Plain-language balance-sheet insights, gated on real figures."""
        k = self.kpis(company_id)
        if not k.get('available'):
            return []
        out = []
        wc = k.get('working_capital')
        cr = k.get('current_ratio')
        dr = k.get('debt_ratio')
        cash = k.get('cash_position')

        if cr is not None:
            if cr >= 2:
                out.append({'label': 'Liquidity strong', 'tone': 'good',
                            'detail': f'Current ratio {cr:.2f} — comfortably covers short-term obligations.'})
            elif cr >= 1:
                out.append({'label': 'Working capital healthy', 'tone': 'good',
                            'detail': f'Current ratio {cr:.2f} — current assets exceed current liabilities.'})
            else:
                out.append({'label': 'Liquidity weak', 'tone': 'bad',
                            'detail': f'Current ratio {cr:.2f} — current liabilities exceed current assets.'})
        if wc is not None and wc < 0:
            out.append({'label': 'Negative working capital', 'tone': 'bad',
                        'detail': 'Short-term liabilities are higher than short-term assets.'})
        if dr is not None:
            if dr > 0.6:
                out.append({'label': 'Debt high', 'tone': 'bad',
                            'detail': f'{dr*100:.0f}% of assets are financed by debt.'})
            elif dr < 0.3:
                out.append({'label': 'Low leverage', 'tone': 'good',
                            'detail': f'Only {dr*100:.0f}% of assets are financed by debt.'})
        if cash is not None and cash > 0:
            out.append({'label': 'Cash reserves', 'tone': 'good',
                        'detail': f'Cash position of approximately ₹{cash:,.0f}.'})
        return out
