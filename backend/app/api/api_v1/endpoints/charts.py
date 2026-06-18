from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.user import User
from app.schemas.chart import ChartSeriesResponse
from app.services.chart_service import ChartService

router = APIRouter()


@router.get('/revenue', response_model=ChartSeriesResponse)
def get_revenue_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ChartService(db)
    return {'data': service.revenue_chart(current_user.company_id)}


@router.get('/profit', response_model=ChartSeriesResponse)
def get_profit_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ChartService(db)
    return {'data': service.profit_chart(current_user.company_id)}


@router.get('/expenses', response_model=ChartSeriesResponse)
def get_expense_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ChartService(db)
    return {'data': service.expense_chart(current_user.company_id)}


@router.get('/health', response_model=ChartSeriesResponse)
def get_health_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ChartService(db)
    return {'data': service.health_score_chart(current_user.company_id)}
