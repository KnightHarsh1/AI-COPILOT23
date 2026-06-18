from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


class ReportPayload(BaseModel):
    summary: str
    metrics: Dict[str, Any]
    trends: List[str]
    risks: List[str]
    recommendations: List[str]
    alerts: List[str]


class ReportGenerateRequest(BaseModel):
    report_type: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ReportResponse(BaseModel):
    id: UUID
    name: str
    report_type: str
    status: str
    generated_at: Optional[datetime]

    generated_by_id: Optional[UUID]

    period_start: Optional[date]
    period_end: Optional[date]

    payload: Optional[ReportPayload]

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]