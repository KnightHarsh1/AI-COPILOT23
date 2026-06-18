from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: UUID
    alert_type: str
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]