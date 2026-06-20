"""Goals tracking. Computes live progress for revenue/profit/collection
goals from current KPIs, with pace-to-target."""

from sqlalchemy.orm import Session

from app.db.models.growth import Goal
from app.services.kpi_engine import KPIService


class GoalService:
    def __init__(self, session: Session):
        self.session = session

    def list_with_progress(self, company_id) -> dict:
        goals = self.session.query(Goal).filter(
            Goal.company_id == company_id, Goal.is_active == True  # noqa: E712
        ).all()
        if not goals:
            return {'available': False, 'goals': []}

        kpis = KPIService(self.session).calculate_kpis(company_id)
        actual_by_type = {
            'revenue': kpis.get('revenue', 0),
            'profit': kpis.get('net_profit', 0),
            'collection': kpis.get('cash_position', 0),
        }
        out = []
        for g in goals:
            target = float(g.target_amount or 0)
            actual = float(actual_by_type.get(g.goal_type, 0))
            pct = round((actual / target * 100), 1) if target else 0.0
            out.append({
                'id': str(g.id),
                'goal_type': g.goal_type,
                'target_amount': target,
                'actual': actual,
                'progress_pct': max(0.0, min(pct, 999.0)),
                'period': g.period,
                'on_track': pct >= 100 or (pct >= 70),
                'gap': round(target - actual, 2),
            })
        return {'available': True, 'goals': out}

    def upsert(self, company_id, goal_type, target_amount, period='monthly') -> Goal:
        goal = self.session.query(Goal).filter(
            Goal.company_id == company_id, Goal.goal_type == goal_type, Goal.is_active == True  # noqa: E712
        ).first()
        if goal:
            goal.target_amount = target_amount
            goal.period = period
        else:
            goal = Goal(company_id=company_id, goal_type=goal_type, target_amount=target_amount, period=period)
            self.session.add(goal)
        self.session.commit()
        return goal
