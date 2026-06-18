from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)
from app.db.models.user import User

from app.schemas.risk_assessment import RiskAssessmentResponse
from app.services.ai_service import AIService

router = APIRouter()


@router.get("/", response_model=RiskAssessmentResponse)
def risk_assessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ai_service = AIService(db)

    return {
        "assessment": ai_service.generate_risk_assessment(
            current_user.company_id, current_user
        )
    }