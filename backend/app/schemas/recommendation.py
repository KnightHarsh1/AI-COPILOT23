from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class RecommendationAction(BaseModel):
    action: str


class RecommendationResponse(BaseModel):
    id: UUID
    recommendation_type: str
    title: str
    reason: str
    actions: List[str]
    priority: str = 'medium'
    expected_impact: Optional[str] = None
    status: str
    generated_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecommendationListResponse(BaseModel):
    recommendations: List[RecommendationResponse]


class RecommendationGenerateRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
