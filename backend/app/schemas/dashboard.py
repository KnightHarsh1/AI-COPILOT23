from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    health_score: float
    revenue: float
    net_profit: float
    expenses: float
    open_alerts: int
    open_recommendations: int