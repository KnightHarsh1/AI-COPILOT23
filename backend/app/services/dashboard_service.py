from typing import Optional
from datetime import date

from sqlalchemy.orm import Session

from app.db.models import Alert, Recommendation
from app.services.kpi_engine import KPIService
from app.services.health_score import HealthScoreService


class DashboardService:
    def __init__(self, session: Session):
        self.session = session
        self.kpi_service = KPIService(session)
        self.health_service = HealthScoreService(session)

    def get_dashboard_summary(
        self,
        company_id,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ):
        kpis = self.kpi_service.calculate_kpis(
            company_id,
            start_date=start_date,
            end_date=end_date,
        )

        health = self.health_service.calculate_health_score(
            company_id,
            start_date=kpis['period_start'],
            end_date=kpis['period_end'],
        )

        open_alerts = (
            self.session.query(Alert)
            .filter(
                Alert.company_id == company_id,
                Alert.status == "open"
            )
            .count()
        )

        open_recommendations = (
            self.session.query(Recommendation)
            .filter(
                Recommendation.company_id == company_id,
                Recommendation.status == "open"
            )
            .count()
        )

        return {
            "health_score": float(health["health_score"]),
            "revenue": float(kpis["revenue"]),
            "net_profit": float(kpis["net_profit"]),
            "expenses": float(kpis["total_expenses"]),
            "open_alerts": open_alerts,
            "open_recommendations": open_recommendations,
        }
