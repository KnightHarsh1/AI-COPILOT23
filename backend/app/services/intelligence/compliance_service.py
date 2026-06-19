"""Compliance Intelligence engine.

Surfaces upcoming/overdue filing deadlines and a compliance score. If the
company has no GSTIN set, it returns a "set up compliance" prompt rather
than an empty calendar. Auto-generates the deadline calendar on first use
if none exists.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.db.models.company import Company
from app.db.models.compliance import ComplianceDeadline
from app.services.intelligence.compliance_calendar import ComplianceCalendarGenerator

DUE_SOON_DAYS = 7


class ComplianceIntelligenceService:
    def __init__(self, session: Session):
        self.session = session

    def analyze(self, company_id) -> dict:
        company = self.session.query(Company).filter(Company.id == company_id).one_or_none()
        if company is None:
            return {'available': False, 'reason': 'Company not found.'}

        if not company.compliance_enabled:
            return {'available': False, 'reason': 'Compliance tracking is turned off for this business.'}

        if not company.gstin:
            return {
                'available': False,
                'needs_setup': True,
                'reason': 'Add your GSTIN in Settings to unlock GST, TDS, and ITR deadline tracking.',
            }

        today = date.today()

        existing = (
            self.session.query(ComplianceDeadline)
            .filter(ComplianceDeadline.company_id == company_id)
            .count()
        )
        if existing == 0:
            ComplianceCalendarGenerator(self.session).generate_for_company(company_id)

        deadlines = (
            self.session.query(ComplianceDeadline)
            .filter(ComplianceDeadline.company_id == company_id)
            .order_by(ComplianceDeadline.due_date)
            .all()
        )

        # Refresh statuses against today (cheap, keeps display accurate).
        upcoming, due_soon, overdue, filed = [], [], [], []
        for d in deadlines:
            if d.status == 'filed':
                filed.append(d)
                continue
            delta = (d.due_date - today).days
            if delta < 0:
                d.status = 'overdue'
                overdue.append(d)
            elif delta <= DUE_SOON_DAYS:
                d.status = 'due_soon'
                due_soon.append(d)
            else:
                d.status = 'upcoming'
                upcoming.append(d)
        self.session.commit()

        def _serialize(d):
            return {
                'id': str(d.id),
                'deadline_type': d.deadline_type,
                'title': d.title,
                'due_date': d.due_date.isoformat(),
                'status': d.status,
                'period_label': d.period_label,
                'days_remaining': (d.due_date - today).days,
            }

        total_relevant = len(deadlines)
        # Compliance score: penalize overdue heavily, due-soon mildly.
        score = 100.0
        score -= len(overdue) * 20
        score -= len(due_soon) * 5
        score = max(0.0, min(100.0, round(score, 1)))

        next_items = (due_soon + upcoming)[:5]

        return {
            'available': True,
            'compliance_score': score,
            'overdue_count': len(overdue),
            'due_soon_count': len(due_soon),
            'upcoming': [_serialize(d) for d in next_items],
            'overdue': [_serialize(d) for d in overdue],
            'gstin': company.gstin,
        }
