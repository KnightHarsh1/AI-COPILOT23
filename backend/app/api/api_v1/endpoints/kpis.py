from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_current_active_user,
    get_db,
)

from app.db.models.user import User
from app.schemas.kpi import KPIRequest, KPIResponse
from app.services.kpi_engine import KPIService

router = APIRouter()


@router.post('/calculate', response_model=KPIResponse)
def calculate_kpis(
    request: KPIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    kpi_service = KPIService(db)

    results = kpi_service.calculate_kpis(
        company_id=current_user.company_id,
        start_date=request.start_date,
        end_date=request.end_date,
    )

    return results