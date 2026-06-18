from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.user import User
from app.schemas.health_score import HealthScoreRequest, HealthScoreResponse
from app.services.health_score import HealthScoreService

router = APIRouter()


@router.post('/calculate', response_model=HealthScoreResponse)
def calculate_health_score(
    request: HealthScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    health_service = HealthScoreService(db)
    result = health_service.calculate_health_score(
        company_id=current_user.company_id,
        start_date=request.start_date,
        end_date=request.end_date,
    )
    return result
