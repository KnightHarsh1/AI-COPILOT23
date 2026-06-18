from datetime import datetime, date
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import Alert
from app.services.alert_rules import AlertRuleEngine
from app.services.health_score import HealthScoreService
from app.services.kpi_engine import KPIService


class AlertService:
    def __init__(self, session: Session):
        self.session = session
        self.kpi_service = KPIService(session)
        self.health_service = HealthScoreService(session)

    def _should_skip_duplicate(self, company_id: Any, title: str) -> bool:
        existing = (
            self.session.query(Alert)
            .filter(
                Alert.company_id == company_id,
                Alert.title == title,
                Alert.status == 'open',
            )
            .one_or_none()
        )
        return existing is not None

    def generate_alerts(
        self,
        company_id: Any,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Alert]:
        self.company_id = company_id
        kpis = self.kpi_service.calculate_kpis(company_id, start_date, end_date)
        health_score = self.health_service.calculate_health_score(company_id, start_date, end_date)

        alert_engine = AlertRuleEngine(self.session, company_id, kpis['period_start'], kpis['period_end'])
        rules = alert_engine.generate_rules(kpis=kpis, health_score=health_score)
        alerts: List[Alert] = []

        for rule in rules:
            if self._should_skip_duplicate(company_id, rule['title']):
                continue
            alert = Alert(
                company_id=company_id,
                alert_type=rule['alert_type'],
                title=rule['title'],
                description=rule.get('description'),
                severity=rule.get('severity', 'low'),
                status=rule.get('status', 'open'),
                triggered_at=datetime.utcnow(),
                is_read=False,
            )
            self.session.add(alert)
            alerts.append(alert)

        if alerts:
            self.session.commit()
        return alerts

    def list_alerts(
        self,
        company_id: Any,
        status: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[Alert]:
        query = self.session.query(Alert).filter(Alert.company_id == company_id)
        if status:
            query = query.filter(Alert.status == status)
        if severity:
            query = query.filter(Alert.severity == severity)
        return query.order_by(Alert.triggered_at.desc()).all()

    def get_alert(self, company_id: Any, alert_id: Any) -> Optional[Alert]:
        return (
            self.session.query(Alert)
            .filter(Alert.company_id == company_id, Alert.id == alert_id)
            .one_or_none()
        )
