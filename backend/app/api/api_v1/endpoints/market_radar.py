from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.user import User
from app.services.market.radar_service import MarketRadarService
from app.services.market.seed_signals import seed_market_signals

router = APIRouter()


@router.get('')
def get_market_radar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Premium feature: requires a plan that includes market_radar.
    from app.db.models.company import Company
    from app.services.billing_service import has_feature
    company = db.query(Company).filter(Company.id == current_user.company_id).one_or_none()
    if company and not has_feature(company.plan, 'market_radar'):
        return {'available': False, 'locked': True,
                'reason': 'Market Radar is a Growth plan feature. Upgrade to unlock external threat & opportunity intelligence.'}
    # Ensure the seed catalog exists so the radar is useful on first run.
    try:
        seed_market_signals(db)
    except Exception:
        pass
    return MarketRadarService(db).build(current_user.company_id)


@router.post('/insights/{insight_id}/dismiss')
def dismiss_insight(
    insight_id,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ok = MarketRadarService(db).set_status(current_user.company_id, insight_id, 'dismissed')
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Insight not found.')
    return {'updated': True, 'status': 'dismissed'}


@router.post('/insights/{insight_id}/act')
def act_on_insight(
    insight_id,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ok = MarketRadarService(db).set_status(current_user.company_id, insight_id, 'acted')
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Insight not found.')
    return {'updated': True, 'status': 'acted'}
