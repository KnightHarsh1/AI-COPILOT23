from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)

from app.db.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/", response_model=DashboardSummaryResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = DashboardService(db)

    return service.get_dashboard_summary(
        current_user.company_id
    )