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
    pulled from the action center, surfaced on dashboard load."""
    from app.services.intelligence.action_center_service import ActionCenterService
    actions = ActionCenterService(db).generate(current_user.company_id)
    top = (actions.get('today') or [])[:1]
    if not top:
        return {'has_action': False, 'message': "You're all caught up — nothing urgent right now."}
    a = top[0]
    return {
        'has_action': True,
        'title': a['title'],
        'reason': a.get('reason'),
        'action': a.get('recommended_action'),
        'priority': a.get('priority'),
    }
