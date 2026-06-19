"""Upload freshness tracking. Computes whether a company's data is due or
overdue based on their chosen upload frequency, and produces the
dashboard status line ("Upload overdue — last upload 35 days ago").
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models.company import Company

# Expected days between uploads per frequency mode. A grace multiplier
# avoids nagging the moment the period ends.
_FREQUENCY_DAYS = {
    'daily': 1,
    'weekly': 7,
    'monthly': 30,
    'quarterly': 91,
    'yearly': 365,
}
_GRACE = 1.3


class UploadFreshnessService:
    def __init__(self, session: Session):
        self.session = session

    def touch(self, company_id) -> None:
        """Record that fresh data was just uploaded. Called from the
        ingestion confirm + legacy upload paths."""
        company = self.session.query(Company).filter(Company.id == company_id).one_or_none()
        if company is not None:
            company.last_data_upload_at = datetime.now(timezone.utc)
            self.session.commit()

    def status(self, company_id) -> dict:
        company = self.session.query(Company).filter(Company.id == company_id).one_or_none()
        if company is None:
            return {'available': False}

        frequency = company.upload_frequency or 'monthly'
        expected_days = _FREQUENCY_DAYS.get(frequency, 30)
        last = company.last_data_upload_at

        if last is None:
            return {
                'available': True,
                'frequency': frequency,
                'last_upload_at': None,
                'days_since': None,
                'status': 'no_data',
                'message': 'No data uploaded yet. Upload your first file to begin.',
            }

        now = datetime.now(timezone.utc)
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        days_since = (now - last).days

        if days_since > expected_days * _GRACE:
            status, message = 'overdue', f'Upload overdue — last upload was {days_since} days ago.'
        elif days_since >= expected_days:
            status, message = 'due', f'Upload due now — last upload {days_since} days ago.'
        else:
            status, message = 'fresh', f'Data is up to date — last upload {days_since} days ago.'

        return {
            'available': True,
            'frequency': frequency,
            'last_upload_at': last.isoformat(),
            'days_since': days_since,
            'expected_days': expected_days,
            'status': status,
            'message': message,
        }
