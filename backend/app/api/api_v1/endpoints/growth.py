from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db, require_role
from app.db.models.company import Company
from app.db.models.growth import TeamMember
from app.db.models.user import User
from app.services.kpi_engine import KPIService
from app.services.benchmark_service import BenchmarkService
from app.services.goal_service import GoalService
from app.services.insight_support_service import (
    AuditService, DataCoverageService, explain_kpi, all_kpi_explanations,
)
from app.services.weekly_summary_service import WeeklySummaryService

router = APIRouter()


@router.get('/coverage')
def coverage(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return DataCoverageService(db).coverage(current_user.company_id)


@router.get('/goals')
def list_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return GoalService(db).list_with_progress(current_user.company_id)


class GoalUpsert(BaseModel):
    goal_type: str
    target_amount: float
    period: str = 'monthly'


@router.post('/goals')
def upsert_goal(payload: GoalUpsert, db: Session = Depends(get_db), current_user: User = Depends(require_role('manager'))):
    GoalService(db).upsert(current_user.company_id, payload.goal_type, payload.target_amount, payload.period)
    AuditService(db).log(current_user.company_id, 'goal', f'Set {payload.goal_type} goal',
                         detail=f'Target {payload.target_amount}', user_id=current_user.id)
    return GoalService(db).list_with_progress(current_user.company_id)


@router.get('/benchmark')
def benchmark(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    company = db.query(Company).filter(Company.id == current_user.company_id).one_or_none()
    kpis = KPIService(db).calculate_kpis(current_user.company_id)
    return BenchmarkService().compare(company.industry if company else None, kpis)


@router.get('/timeline')
def timeline(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return {'events': AuditService(db).timeline(current_user.company_id)}


@router.get('/explain/{metric}')
def explain(metric: str, current_user: User = Depends(get_current_active_user)):
    return {'metric': metric, 'explanation': explain_kpi(metric)}


@router.get('/explanations')
def explanations(current_user: User = Depends(get_current_active_user)):
    return all_kpi_explanations()


@router.get('/weekly-summary')
def weekly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return WeeklySummaryService(db).build(current_user.company_id)


@router.get('/team')
def list_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    rows = db.query(TeamMember).filter(TeamMember.company_id == current_user.company_id).all()
    return {'members': [{'id': str(r.id), 'email': r.email, 'name': r.name, 'role': r.role, 'status': r.status} for r in rows]}


class TeamInvite(BaseModel):
    email: str
    name: Optional[str] = None
    role: str = 'read_only'


@router.post('/team')
def invite_member(payload: TeamInvite, db: Session = Depends(get_db), current_user: User = Depends(require_role('owner'))):
    from app.db.models.user import User as UserModel
    from app.core.security import get_password_hash
    import secrets
    email = payload.email.strip().lower()
    member = TeamMember(company_id=current_user.company_id, email=email,
                        name=payload.name, role=payload.role, status='invited')
    db.add(member)

    # Create a real login under the SAME company so the invitee can sign in.
    existing = db.query(UserModel).filter(UserModel.email == email).first()
    temp_password = secrets.token_urlsafe(9)
    if existing is None:
        login = UserModel(
            company_id=current_user.company_id,
            email=email,
            first_name=(payload.name or email.split('@')[0]),
            hashed_password=get_password_hash(temp_password),
            team_role=payload.role,
        )
        db.add(login)
        member.status = 'active'
    else:
        existing.team_role = payload.role
        member.status = 'active'
        temp_password = None
    db.commit()

    AuditService(db).log(current_user.company_id, 'settings', f'Invited {email} as {payload.role}',
                         user_id=current_user.id)

    # Notify the invitee with their temp credentials (delivered if a provider
    # is configured, otherwise queued/logged).
    if temp_password:
        try:
            from app.services.notification_service import NotificationService
            NotificationService().send_email(
                email, "You've been invited to Business Copilot",
                f"You have {payload.role} access. Sign in with this email and temporary password: {temp_password}\nPlease change it after first login.",
            )
        except Exception:
            pass

    return {'id': str(member.id), 'email': member.email, 'role': member.role,
            'status': member.status, 'temp_password': temp_password}


@router.delete('/team/{member_id}')
def remove_member(member_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role('owner'))):
    db.query(TeamMember).filter(TeamMember.company_id == current_user.company_id, TeamMember.id == member_id).delete()
    db.commit()
    return {'removed': True}


@router.post('/demo-data')
def load_demo_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Loads a realistic demo dataset so a first-time user sees a fully
    populated Command Center in seconds, before importing their own files."""
    from app.services.demo_data_service import DemoDataService
    result = DemoDataService(db).load(current_user.company_id, current_user.id)
    return result


@router.post('/send-digest')
def send_digest_now(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.services.notification_dispatcher import NotificationDispatcher
    return NotificationDispatcher(db).send_weekly_digest(current_user.company_id)


@router.post('/run-checks')
def run_checks_now(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.services.notification_dispatcher import NotificationDispatcher
    return NotificationDispatcher(db).run_daily_checks(current_user.company_id)


class PhoneUpdate(BaseModel):
    phone: str


@router.patch('/notification-phone')
def update_phone(payload: PhoneUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role('manager'))):
    current_user.phone = payload.phone.strip() or None
    db.commit()
    return {'updated': True, 'phone': current_user.phone}


@router.get('/proactive-brief')
def proactive_brief(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """The AI CFO speaking first: the single most important thing to do now,
    pulled from the action center, surfaced on dashboard load — with a
    citation of the numbers it's based on, so the owner can trust it."""
    from app.services.intelligence.action_center_service import ActionCenterService
    from app.services.kpi_engine import KPIService
    actions = ActionCenterService(db).generate(current_user.company_id)
    top = (actions.get('today') or [])[:1]
    if not top:
        return {'has_action': False, 'message': "You're all caught up — nothing urgent right now."}
    a = top[0]
    # Citation: the live figures this action draws on.
    kpis = KPIService(db).calculate_kpis(current_user.company_id)
    citations = []
    if kpis.get('outstanding_receivables'):
        citations.append(f"₹{kpis['outstanding_receivables']:,.0f} outstanding to collect")
    if kpis.get('net_profit') is not None:
        citations.append(f"net profit ₹{kpis['net_profit']:,.0f}")
    if kpis.get('runway_months'):
        citations.append(f"~{kpis['runway_months']:.1f} months runway")
    return {
        'has_action': True,
        'title': a['title'],
        'reason': a.get('reason'),
        'action': a.get('recommended_action'),
        'priority': a.get('priority'),
        'based_on': citations,
    }


class AskRequest(BaseModel):
    question: str


@router.post('/ask')
def ask(payload: AskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.services.business_query_service import BusinessQueryService
    return BusinessQueryService(db).ask(current_user.company_id, payload.question)


@router.get('/score-change')
def score_change(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.services.insight_support_service import HealthScoreDiffService
    return HealthScoreDiffService(db).diff(current_user.company_id)


@router.get('/notifications')
def notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """In-app notification center: recent notification + alert events."""
    from app.db.models.growth import AuditLog
    rows = db.query(AuditLog).filter(
        AuditLog.company_id == current_user.company_id,
        AuditLog.event_type.in_(['notification', 'import', 'compliance', 'invoice']),
    ).order_by(AuditLog.created_at.desc()).limit(30).all()
    return {'notifications': [{
        'type': r.event_type, 'title': r.title, 'detail': r.detail,
        'date': r.created_at.isoformat() if r.created_at else None,
    } for r in rows]}


@router.get('/export')
def export_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Data export (trust/portability): all of the company's core records."""
    from app.db.models.sale import Sale
    from app.db.models.expense import Expense
    from app.db.models.inventory import InventoryItem
    from app.db.models.customer import Customer
    cid = current_user.company_id

    def dump(model, fields):
        out = []
        for r in db.query(model).filter(model.company_id == cid).all():
            out.append({f: (str(getattr(r, f)) if getattr(r, f, None) is not None else None) for f in fields})
        return out

    return {
        'company_id': str(cid),
        'sales': dump(Sale, ['invoice_date', 'amount', 'category', 'payment_status', 'amount_paid']),
        'expenses': dump(Expense, ['incurred_date', 'vendor', 'category', 'amount']),
        'inventory': dump(InventoryItem, ['product_name', 'quantity', 'unit_cost', 'reorder_level']),
        'customers': dump(Customer, ['name', 'status']),
    }


@router.delete('/account')
def delete_account_data(db: Session = Depends(get_db), current_user: User = Depends(require_role('owner'))):
    """Delete all business data for the company (account-data erasure).
    Keeps the login so the user can re-import; clears business records."""
    from app.db.models.sale import Sale
    from app.db.models.expense import Expense
    from app.db.models.inventory import InventoryItem
    from app.db.models.customer import Customer
    from app.db.models.alert import Alert
    from app.db.models.recommendation import Recommendation
    cid = current_user.company_id
    for model in (Sale, Expense, InventoryItem, Customer, Alert, Recommendation):
        db.query(model).filter(model.company_id == cid).delete()
    db.commit()
    AuditService(db).log(cid, 'settings', 'Erased all business data', user_id=current_user.id)
    return {'deleted': True}
