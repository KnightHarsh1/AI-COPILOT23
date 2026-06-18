from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class BriefItem(BaseModel):
    category: str  # customer_risk | inventory_risk | expense_spike | revenue_opportunity | growth_opportunity | profitability | general
    priority: str  # high | medium | low
    issue: str
    cause: str
    recommendation: str
    expected_impact: str


class DashboardBriefResponse(BaseModel):
    headline: str
    health_score: float
    items: List[BriefItem]
    generated_at: datetime
    # Kept for backward compatibility with any existing consumers expecting plain text.
    brief: Optional[str] = None
