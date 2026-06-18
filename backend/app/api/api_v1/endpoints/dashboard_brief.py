from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models.user import User

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)

from app.schemas.dashboard_brief import (
    DashboardBriefResponse,
)

from app.services.ai_service import AIService

router = APIRouter()


@router.get("/", response_model=DashboardBriefResponse)
def dashboard_brief(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ai_service = AIService(db)
    return ai_service.generate_dashboard_brief(current_user.company_id, current_user)
