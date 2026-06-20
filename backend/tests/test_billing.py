from app.services.billing_service import BillingService, has_feature, PLANS


def test_plan_gating():
    assert not has_feature('starter', 'market_radar')
    assert has_feature('growth', 'market_radar')
    assert has_feature('pro', 'whatsapp')
    assert not has_feature('growth', 'whatsapp')


def test_activate_changes_plan(session, company):
    svc = BillingService(session)
    res = svc.activate(company.id, 'growth')
    assert res['ok'] is True
    session.refresh(company)
    assert company.plan == 'growth'


def test_unknown_plan_rejected(session, company):
    assert BillingService(session).activate(company.id, 'enterprise')['ok'] is False
