from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.user import User
from app.services.intelligence.banking_liquidity_service import (
    BankingLiquidityService,
    liquidity_report,
)

router = APIRouter()


@router.get('')
def get_banking_liquidity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return BankingLiquidityService(db).analyze(current_user.company_id)


@router.get('/report')
def get_liquidity_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return liquidity_report(db, current_user.company_id)
