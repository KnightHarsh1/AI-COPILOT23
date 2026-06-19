"""Generates statutory filing deadlines from standard Indian filing-cadence
rules, so the compliance widget is useful the moment a GSTIN is added —
no manual deadline entry needed.

Rules encoded (standard, simplified):
  - GSTR-1: 11th of the following month (monthly filers)
  - GSTR-3B: 20th of the following month (monthly filers)
  - TDS payment: 7th of the following month
  - Advance tax: 15 Jun / 15 Sep / 15 Dec / 15 Mar
  - ITR (non-audit): 31 Jul following the financial year

These are general defaults, not tax advice; due dates can shift with
government notifications, so the widget labels them "standard due date".
"""

from datetime import date
from calendar import monthrange

from sqlalchemy.orm import Session

from app.db.models.company import Company
from app.db.models.compliance import ComplianceDeadline

DUE_SOON_DAYS = 7


def _month_name(month: int) -> str:
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]


def _next_month(year: int, month: int):
    return (year + 1, 1) if month == 12 else (year, month + 1)


def _status_for(due: date, today: date) -> str:
    delta = (due - today).days
    if delta < 0:
        return 'overdue'
    if delta <= DUE_SOON_DAYS:
        return 'due_soon'
    return 'upcoming'


class ComplianceCalendarGenerator:
    def __init__(self, session: Session):
        self.session = session

    def generate_for_company(self, company_id, months_ahead: int = 3) -> int:
        """Idempotently (re)generate the rolling deadline window for a
        company. Clears future auto-generated rows and re-seeds, so it can
        be re-run safely (e.g. nightly or after a GSTIN is added).
        Returns the number of deadlines written."""
        company = self.session.query(Company).filter(Company.id == company_id).one_or_none()
        if company is None or not company.compliance_enabled:
            return 0

        today = date.today()

        # Clear existing non-filed deadlines so re-running refreshes status.
        self.session.query(ComplianceDeadline).filter(
            ComplianceDeadline.company_id == company_id,
            ComplianceDeadline.status != 'filed',
        ).delete()

        deadlines = []
        has_gst = bool(company.gstin)

        for offset in range(months_ahead + 1):
            y, m = today.year, today.month
            for _ in range(offset):
                y, m = _next_month(y, m)
            period = f"{_month_name(m)} {y}"
            ny, nm = _next_month(y, m)

            if has_gst:
                gstr1_due = date(ny, nm, 11)
                deadlines.append(('gstr1', f'GSTR-1 for {period}', gstr1_due, period))
                gstr3b_due = date(ny, nm, 20)
                deadlines.append(('gstr3b', f'GSTR-3B for {period}', gstr3b_due, period))

            tds_due = date(ny, nm, 7)
            deadlines.append(('tds', f'TDS payment for {period}', tds_due, period))

        # Advance tax instalments for the current calendar year.
        for adv_month, adv_day in [(6, 15), (9, 15), (12, 15), (3, 15)]:
            adv_year = today.year if adv_month >= today.month else today.year + 1
            deadlines.append((
                'advance_tax',
                f'Advance tax instalment ({_month_name(adv_month)})',
                date(adv_year, adv_month, adv_day),
                f'{_month_name(adv_month)} {adv_year}',
            ))

        # ITR (non-audit) — 31 Jul following the FY.
        itr_year = today.year if today.month <= 7 else today.year + 1
        deadlines.append(('itr', 'Income Tax Return (non-audit)', date(itr_year, 7, 31), f'FY ending Mar {itr_year}'))

        written = 0
        seen = set()
        for deadline_type, title, due, period in deadlines:
            key = (deadline_type, due)
            if key in seen:
                continue
            seen.add(key)
            self.session.add(ComplianceDeadline(
                company_id=company_id,
                deadline_type=deadline_type,
                title=title,
                due_date=due,
                status=_status_for(due, today),
                period_label=period,
                notes='Standard due date — may shift with government notifications.',
            ))
            written += 1

        self.session.commit()
        return written
