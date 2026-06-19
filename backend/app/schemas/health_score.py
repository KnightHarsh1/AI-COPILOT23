from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class HealthScoreRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class HealthScoreComponents(BaseModel):
    revenue_growth_score: float
    profitability_score: float
    inventory_health_score: float
    customer_risk_score: float


class ComponentUnavailable(BaseModel):
    component: str
    reason: str


class HealthScoreResponse(BaseModel):
    health_score: float
    # These 4 stay required, non-Optional floats -- report_service.py
    # destructures and rounds them directly, so they must never become
    # None. See PRODUCTION_ARCHITECTURE_REVIEW.md section 5.
    revenue_growth_score: float
    profitability_score: float
    inventory_health_score: float
    customer_risk_score: float
    # Additive only, below this line.
    liquidity_solvency_score: Optional[float] = None
    data_completeness: float = 0.0
    components_unavailable: List[ComponentUnavailable] = []
    period_start: date
    period_end: date
    payload: Optional[Dict[str, Any]] = None
