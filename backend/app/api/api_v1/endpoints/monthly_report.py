from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)
from app.db.models.user import User

from app.schemas.monthly_report import MonthlyReportResponse
from app.services.ai_service import AIService

router = APIRouter()


@router.get("/", response_model=MonthlyReportResponse)
def monthly_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ai_service = AIService(db)

    return {
        "report": ai_service.generate_monthly_report(
            current_user.company_id, current_user
        )
    }