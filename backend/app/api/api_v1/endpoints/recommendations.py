from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models.user import User

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)

from app.schemas.recommendation import (
    RecommendationGenerateRequest,
    RecommendationListResponse,
    RecommendationResponse,
)

from app.services.recommendation_service import RecommendationService

router = APIRouter()


@router.post('/generate', response_model=RecommendationListResponse)
def generate_recommendations(
    request: RecommendationGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = RecommendationService(db)

    recommendations = service.generate_recommendations(
        company_id=current_user.company_id,
        generated_by_id=current_user.id,
        start_date=request.start_date,
        end_date=request.end_date,
    )

    return {'recommendations': recommendations}


@router.get('/', response_model=RecommendationListResponse)
def list_recommendations(
    recommendation_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = RecommendationService(db)

    recommendations = service.list_recommendations(
        company_id=current_user.company_id,
        recommendation_type=recommendation_type,
        status=status,
    )

    return {'recommendations': recommendations}


@router.get('/{recommendation_id}', response_model=RecommendationResponse)
def get_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = RecommendationService(db)

    recommendation = service.get_recommendation(
        current_user.company_id,
        recommendation_id,
    )

    if recommendation is None:
        raise HTTPException(
            status_code=404,
            detail='Recommendation not found',
        )

    return recommendation