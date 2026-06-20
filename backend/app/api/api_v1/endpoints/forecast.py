from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models.user import User

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)

from app.schemas.forecast import ForecastResponse
from app.services.ai_service import AIService

router = APIRouter()


@router.get("/", response_model=ForecastResponse)
def forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ai_service = AIService(db)

    return {
        "forecast": ai_service.generate_forecast(
            current_user.company_id, current_user
        ),
        "confidence": ai_service.forecast_confidence(current_user.company_id),
    }