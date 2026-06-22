"""Profitability Intelligence from an uploaded P&L statement. Reads the latest
profit_and_loss FinancialStatementLine rows and derives revenue, COGS, gross
profit, operating expenses, EBITDA, net profit, and the margin set, plus a
profitability score. Prefers explicit total lines (Gross Profit, Net Profit)
when present, and falls back to computing them from components otherwise.

Independent of Sales/Expense logic. Returns {'available': False} when no P&L
has been uploaded so the Command Center hides the section.
"""
from decimal import Decimal

from sqlalchemy import func

from app.db.models.financial_statement import FinancialStatementLine


def _d(v):
    try:
        return Decimal(str(v or 0))
    except Exception:
        return Decimal('0')


class ProfitLossService:
    def __init__(self, session):
        self.session = session

    def latest_date(self, company_id):
        return self.session.query(func.max(FinancialStatementLine.statement_date)).filter(
            FinancialStatementLine.company_id == company_id,
            FinancialStatementLine.statement_type == 'profit_and_loss',
        ).scalar()

    def has_pnl(self, company_id) -> bool:
        return self.latest_date(company_id) is not None

    def _sum(self, company_id, statement_date, categories) -> Decimal:
        total = self.session.query(func.coalesce(func.sum(FinancialStatementLine.amount), 0)).filter(
            FinancialStatementLine.company_id == company_id,
            FinancialStatementLine.statement_type == 'profit_and_loss',
            FinancialStatementLine.statement_date == statement_date,
            FinancialStatementLine.line_category.in_(categories),
        ).scalar()
        return _d(total)

    def figures(self, company_id) -> dict:
        sd = self.latest_date(company_id)
        if sd is None:
            return {'available': False}

        revenue_components = self._sum(company_id, sd, ['revenue'])
        total_revenue_line = self._sum(company_id, sd, ['total_revenue'])
        revenue = total_revenue_line if total_revenue_line != 0 else revenue_components
        other_income = self._sum(company_id, sd, ['other_income'])
        cogs = self._sum(company_id, sd, ['cogs'])
        opex_components = self._sum(company_id, sd, ['operating_expenses'])
        total_opex_line = self._sum(company_id, sd, ['total_operating_expenses'])
        opex = total_opex_line if total_opex_line != 0 else opex_components
        depreciation = self._sum(company_id, sd, ['depreciation'])
        interest = self._sum(company_id, sd, ['interest'])
        tax = self._sum(company_id, sd, ['tax'])
        other_expenses = self._sum(company_id, sd, ['other_expenses'])

        # Prefer explicit total lines when the statement provides them.
        gross_profit_line = self._sum(company_id, sd, ['gross_profit'])
        operating_profit_line = self._sum(company_id, sd, ['operating_profit'])
        pbt_line = self._sum(company_id, sd, ['profit_before_tax'])
        net_profit_line = self._sum(company_id, sd, ['net_profit'])

        gross_profit = gross_profit_line if gross_profit_line != 0 else (revenue - cogs)
        operating_profit = operating_profit_line if operating_profit_line != 0 else (gross_profit - opex)
        # EBITDA ≈ operating profit + depreciation (+ amortisation, folded in).
        ebitda = operating_profit + depreciation
        pbt = pbt_line if pbt_line != 0 else (operating_profit - interest + other_income - other_expenses)
        net_profit = net_profit_line if net_profit_line != 0 else (pbt - tax)

        return {
            'available': True,
            'statement_date': sd.isoformat() if sd else None,
            'revenue': float(revenue),
            'other_income': float(other_income),
            'cogs': float(cogs),
            'gross_profit': float(gross_profit),
            'operating_expenses': float(opex),
            'operating_profit': float(operating_profit),
            'depreciation': float(depreciation),
            'ebitda': float(ebitda),
            'interest': float(interest),
            'tax': float(tax),
            'net_profit': float(net_profit),
        }

    def kpis(self, company_id) -> dict:
        f = self.figures(company_id)
        if not f.get('available'):
            return {'available': False}
        revenue = _d(f['revenue'])
        gross = _d(f['gross_profit'])
        op = _d(f['operating_profit'])
        net = _d(f['net_profit'])
        ebitda = _d(f['ebitda'])

        def margin(x):
            return float(round(x / revenue * 100, 2)) if revenue > 0 else None

        gross_margin = margin(gross)
        operating_margin = margin(op)
        net_margin = margin(net)
        ebitda_margin = margin(ebitda)

        # Profitability score 0-100 from net margin (10%+ is strong) and
        # whether the business is profitable at all.
        if net_margin is None:
            profitability_score = None
        else:
            score = 50 + net_margin * 2.5  # 10% margin -> 75, 20% -> 100
            if net <= 0:
                score = min(score, 40)
            profitability_score = float(max(0, min(100, round(score))))

        return {
            'available': True,
            'statement_date': f['statement_date'],
            'revenue': f['revenue'],
            'gross_profit': f['gross_profit'],
            'operating_profit': f['operating_profit'],
            'ebitda': f['ebitda'],
            'net_profit': f['net_profit'],
            'gross_margin': gross_margin,
            'operating_margin': operating_margin,
            'net_margin': net_margin,
            'ebitda_margin': ebitda_margin,
            'profitability_score': profitability_score,
        }

    def insights(self, company_id) -> list:
        k = self.kpis(company_id)
        if not k.get('available'):
            return []
        out = []
        nm = k.get('net_margin')
        gm = k.get('gross_margin')
        net = k.get('net_profit')

        if net is not None and net < 0:
            out.append({'label': 'Operating at a loss', 'tone': 'bad',
                        'detail': f'Net profit is ₹{net:,.0f} on the latest P&L.'})
        elif nm is not None and nm >= 10:
            out.append({'label': 'Healthy net margin', 'tone': 'good',
                        'detail': f'Net margin is {nm:.1f}% — a solid profitability level.'})
        elif nm is not None and nm < 5:
            out.append({'label': 'Thin net margin', 'tone': 'bad',
                        'detail': f'Net margin is just {nm:.1f}% — little buffer for cost increases.'})

        if gm is not None and nm is not None and (gm - nm) > 30:
            out.append({'label': 'Operating costs eating margin', 'tone': 'neutral',
                        'detail': f'Gross margin {gm:.0f}% but net only {nm:.0f}% — operating costs are heavy.'})
        if k.get('ebitda') is not None and k['ebitda'] > 0:
            out.append({'label': 'Positive EBITDA', 'tone': 'good',
                        'detail': f'EBITDA of ₹{k["ebitda"]:,.0f} — core operations are cash-generative.'})
        return out
