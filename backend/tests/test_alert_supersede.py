from datetime import datetime
from app.db.models.alert import Alert
from app.services.alert_service import AlertService


def test_stale_open_alerts_resolved_when_not_regenerated(session, company, monkeypatch):
    session.add(Alert(company_id=company.id, alert_type='profit', title='Old profit drop',
                      description='x', severity='high', status='open', is_read=False,
                      triggered_at=datetime.utcnow()))
    session.commit()

    # Fresh data triggers no rules -> stale open alert must be superseded.
    monkeypatch.setattr('app.services.alert_service.AlertRuleEngine.generate_rules',
                        lambda self, **kw: [])
    AlertService(session).generate_alerts(company.id)

    open_count = session.query(Alert).filter(Alert.company_id == company.id, Alert.status == 'open').count()
    assert open_count == 0


def test_acknowledged_alerts_preserved(session, company, monkeypatch):
    # is_read=True (acknowledged) alerts must NOT be auto-resolved.
    session.add(Alert(company_id=company.id, alert_type='profit', title='Ack alert',
                      description='x', severity='high', status='open', is_read=True,
                      triggered_at=datetime.utcnow()))
    session.commit()
    monkeypatch.setattr('app.services.alert_service.AlertRuleEngine.generate_rules',
                        lambda self, **kw: [])
    AlertService(session).generate_alerts(company.id)
    still_open = session.query(Alert).filter(Alert.company_id == company.id, Alert.status == 'open').count()
    assert still_open == 1
