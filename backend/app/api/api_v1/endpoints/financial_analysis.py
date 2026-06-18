from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)
from app.db.models.user import User

from app.schemas.financial_analysis import FinancialAnalysisResponse
from app.services.ai_service import AIService

router = APIRouter()


@router.get("/", response_model=FinancialAnalysisResponse)
def financial_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ai_service = AIService(db)

    return {
        "analysis": ai_service.generate_financial_analysis(
            current_user.company_id, current_user
        )
    }