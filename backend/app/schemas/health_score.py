from datetime import date
from typing import Any, Dict, Optional

from pydantic import BaseModel


class HealthScoreRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class HealthScoreComponents(BaseModel):
    revenue_growth_score: float
    profitability_score: float
    inventory_health_score: float
    customer_risk_score: float


class HealthScoreResponse(BaseModel):
    health_score: float
    revenue_growth_score: float
    profitability_score: float
    inventory_health_score: float
    customer_risk_score: float
    period_start: date
    period_end: date
    payload: Optional[Dict[str, Any]] = None
