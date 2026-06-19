"""Aggregator the /market-radar endpoint calls. Matches signals,
translates them, computes the Market Preparedness Score, materializes
per-company insights, and returns the compact widget + drawer payload.

Mirrors CommandCenterService: every section is best-effort so a radar
failure never breaks the dashboard.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models.company import Company
from app.db.models.market import UserMarketInsight
from app.services.market.relevance_service import MarketRelevanceService
from app.services.market.translation_service import MarketTranslationService


def _f(v) -> float:
    return float(v) if v is not None else 0.0


class MarketRadarService:
    def __init__(self, session: Session):
        self.session = session

    def _preparedness_score(self, matches, company) -> dict:
        """0-100: starts high, reduced by unaddressed threats weighted by
        severity, lifted slightly by opportunities the business is ready
        for. Data-availability-aware and explainable."""
        if not matches:
            return {'score': None, 'note': 'Not enough market signals matched yet.'}

        threats = [m for m in matches if m['direction'] == 'threat']
        opportunities = [m for m in matches if m['direction'] == 'opportunity']

        score = 100.0
        for t in threats:
            score -= (t['severity'] / 100.0) * 14
        score += min(len(opportunities) * 2.0, 8.0)
        score = max(0.0, min(100.0, round(score, 1)))

        return {
            'score': score,
            'threat_count': len(threats),
            'opportunity_count': len(opportunities),
        }

    def build(self, company_id) -> dict:
        company = self.session.query(Company).filter(Company.id == company_id).one_or_none()
        if company is None:
            return {'available': False, 'reason': 'Company not found.'}

        relevance = MarketRelevanceService(self.session).match(company)
        if not relevance.get('available'):
            return {
                'available': False,
                'needs_industry': relevance.get('needs_industry', False),
                'reason': relevance.get('reason', 'Market radar not available yet.'),
            }

        matches = relevance['matches']
        cards = MarketTranslationService().translate_batch(matches, company)

        # Materialize: clear prior active insights, write fresh ones (keeps
        # dismissed/acted history intact).
        self.session.query(UserMarketInsight).filter(
            UserMarketInsight.company_id == company_id,
            UserMarketInsight.status == 'active',
        ).delete()

        threats, opportunities = [], []
        for m in matches:
            sig = m['signal']
            card = cards.get(str(sig.id), {})
            insight = UserMarketInsight(
                company_id=company_id,
                signal_id=sig.id,
                direction=m['direction'],
                severity=m['severity'],
                impact_amount_low=m['impact_low'],
                impact_amount_high=m['impact_high'],
                headline=card.get('headline'),
                why_it_matters=card.get('why_it_matters'),
                recommended_action=card.get('recommended_action'),
                match_reasons=m['match_reasons'],
                status='active',
            )
            self.session.add(insight)
            self.session.flush()

            payload = {
                'id': str(insight.id),
                'signal_type': sig.signal_type,
                'direction': m['direction'],
                'severity': m['severity'],
                'impact_low': m['impact_low'],
                'impact_high': m['impact_high'],
                'headline': card.get('headline'),
                'why_it_matters': card.get('why_it_matters'),
                'recommended_action': card.get('recommended_action'),
                'match_reasons': m['match_reasons'],
                'source_name': sig.source_name,
                'source_url': sig.source_url,
            }
            (threats if m['direction'] == 'threat' else opportunities).append(payload)

        self.session.commit()

        preparedness = self._preparedness_score(matches, company)

        return {
            'available': True,
            'preparedness': preparedness,
            'threat_count': len(threats),
            'opportunity_count': len(opportunities),
            'top_threats': threats[:3],
            'top_opportunities': opportunities[:3],
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }

    def set_status(self, company_id, insight_id, status: str) -> bool:
        insight = self.session.query(UserMarketInsight).filter(
            UserMarketInsight.company_id == company_id,
            UserMarketInsight.id == insight_id,
        ).one_or_none()
        if insight is None:
            return False
        insight.status = status
        self.session.commit()
        return True
