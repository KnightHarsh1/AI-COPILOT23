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
