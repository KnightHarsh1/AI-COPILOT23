"""The brain of the Radar: deterministically match catalog signals to a
specific company and quantify the rupee impact against their real numbers.

No AI here -- relevance and impact are arithmetic, so they're consistent
and defensible. The AI translation layer only phrases what this produces.
"""

from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.company import Company
from app.db.models.expense import Expense
from app.db.models.market import MarketSignal
from app.db.models.sale import Sale

# Maps an impact lever to how we estimate the rupee exposure for it.
# All are computed from the company's own trailing data.
_LEVER_BASIS = {
    'raw_material_cost': 'expenses',
    'compliance_cost': 'expenses',
    'finance_cost': 'expenses',
    'cost_saving': 'expenses',
    'selling_price': 'revenue',
    'demand': 'revenue',
}


def _f(v) -> float:
    return float(v) if v is not None else 0.0


class MarketRelevanceService:
    def __init__(self, session: Session):
        self.session = session

    def _company_industry_terms(self, company: Company):
        terms = set()
        for value in (company.industry, company.sub_industry):
            if value:
                terms.add(value.strip().lower())
        return terms

    def _trailing_revenue(self, company_id) -> float:
        return _f(self.session.query(func.coalesce(func.sum(Sale.amount), 0))
                  .filter(Sale.company_id == company_id).scalar())

    def _trailing_expenses(self, company_id) -> float:
        return _f(self.session.query(func.coalesce(func.sum(Expense.amount), 0))
                  .filter(Expense.company_id == company_id).scalar())

    def match(self, company: Company):
        """Returns a list of dicts: the relevant signals with computed
        severity (0-100), rupee impact range, and human-readable match
        reasons. Sorted strongest-first."""
        industry_terms = self._company_industry_terms(company)
        if not industry_terms:
            return {'available': False, 'needs_industry': True,
                    'reason': 'Add your industry in Settings to activate the Market Radar.'}

        today = date.today()
        signals = self.session.query(MarketSignal).all()
        revenue = self._trailing_revenue(company.id)
        expenses = self._trailing_expenses(company.id)

        results = []
        for sig in signals:
            if sig.valid_until and sig.valid_until < today:
                continue
            sig_industries = {str(s).lower() for s in (sig.industries or [])}
            if not (industry_terms & sig_industries):
                continue

            reasons = [f"{company.industry} industry"]
            impact = sig.impact_model or {}
            lever = impact.get('lever')
            magnitude = float(impact.get('magnitude_pct', 0)) / 100.0

            basis = _LEVER_BASIS.get(lever)
            impact_low = impact_high = None
            exposure_boost = 0.0

            if basis == 'expenses' and expenses > 0:
                base_impact = expenses * magnitude
                impact_low, impact_high = base_impact * 0.6, base_impact * 1.2
                exposure_boost = 15 if expenses > revenue * 0.5 else 8
                reasons.append('Affects your cost base')
            elif basis == 'revenue' and revenue > 0:
                base_impact = revenue * magnitude
                impact_low, impact_high = base_impact * 0.5, base_impact * 1.1
                exposure_boost = 12
                reasons.append('Affects your revenue')

            severity = min(100.0, float(sig.severity_base) * 18 + exposure_boost)

            results.append({
                'signal': sig,
                'direction': sig.direction,
                'severity': round(severity, 1),
                'impact_low': round(impact_low, 2) if impact_low is not None else None,
                'impact_high': round(impact_high, 2) if impact_high is not None else None,
                'match_reasons': reasons,
            })

        results.sort(key=lambda r: r['severity'], reverse=True)
        return {'available': True, 'matches': results}
