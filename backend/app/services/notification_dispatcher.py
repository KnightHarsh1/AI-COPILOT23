"""Dispatcher that connects business events and scheduled digests to the
delivery layer (email + WhatsApp), respecting each user's notification
toggles. This is the wire between 'something happened' and 'the owner is
told', and it records every send in the audit log.
"""

from sqlalchemy.orm import Session

from app.db.models.company import Company
from app.db.models.user import User
from app.services.notification_service import NotificationService
from app.services.weekly_summary_service import WeeklySummaryService
from app.services.insight_support_service import AuditService


class NotificationDispatcher:
    def __init__(self, session: Session):
        self.session = session
        self.notifier = NotificationService()
        self.audit = AuditService(session)

    def _owner(self, company_id):
        return (
            self.session.query(User)
            .filter(User.company_id == company_id)
            .order_by(User.created_at.asc())
            .first()
        )

    def _deliver(self, user: Company, subject: str, body: str, company_id):
        results = []
        if getattr(user, 'email_alerts_enabled', True) and user.email:
            results.append(self.notifier.send_email(user.email, subject, body))
        phone = getattr(user, 'phone', None)
        # WhatsApp is a paid (Pro) channel.
        whatsapp_ok = False
        try:
            from app.db.models.company import Company as Co
            from app.services.billing_service import has_feature
            co = self.session.query(Co).filter(Co.id == company_id).one_or_none()
            whatsapp_ok = bool(co and has_feature(co.plan, 'whatsapp'))
        except Exception:
            whatsapp_ok = False
        if phone and whatsapp_ok:
            results.append(self.notifier.send_whatsapp(phone, f"{subject}\n\n{body}"))
        self.audit.log(company_id, 'notification', subject, detail=body[:480], user_id=getattr(user, 'id', None))
        return results

    def _recently_sent(self, company_id, title: str, cooldown_days: int) -> bool:
        """True if an identical notification was already sent within the
        cooldown window — prevents daily nag-spam while a condition persists
        (e.g. data stays overdue for a week)."""
        try:
            from datetime import datetime, timedelta, timezone
            from app.db.models.growth import AuditLog
            cutoff = datetime.now(timezone.utc) - timedelta(days=cooldown_days)
            existing = (
                self.session.query(AuditLog)
                .filter(
                    AuditLog.company_id == company_id,
                    AuditLog.event_type == 'notification',
                    AuditLog.title == f"Business Copilot: {title}",
                    AuditLog.created_at >= cutoff,
                )
                .first()
            )
            return existing is not None
        except Exception:
            return False

    def send_event_alert(self, company_id, title: str, message: str, cooldown_days: int = 0):
        """Called when a business event fires (overdue invoice, compliance
        due-soon, health-score drop). cooldown_days>0 suppresses repeats of
        the same alert within that window."""
        if cooldown_days and self._recently_sent(company_id, title, cooldown_days):
            return {'sent': False, 'suppressed': True}
        user = self._owner(company_id)
        if not user:
            return {'sent': False}
        results = self._deliver(user, f"Business Copilot: {title}", message, company_id)
        return {'sent': any(r.get('sent') for r in results), 'results': results}

    def send_weekly_digest(self, company_id):
        user = self._owner(company_id)
        if not user:
            return {'sent': False}
        if not getattr(user, 'weekly_reports_enabled', True):
            return {'sent': False, 'reason': 'weekly reports disabled'}
        summary = WeeklySummaryService(self.session).build(company_id)
        body = summary['headline'] + "\n\n" + "\n".join(summary['lines'])
        if summary.get('top_actions'):
            body += "\n\nTop actions:\n" + "\n".join(f"- {a['title']}" for a in summary['top_actions'])
        results = self._deliver(user, "Your weekly business summary", body, company_id)
        return {'sent': any(r.get('sent') for r in results), 'results': results}

    def run_daily_checks(self, company_id):
        """Daily: fire alerts for overdue collections, imminent compliance
        deadlines, and stale data. Best-effort, never raises."""
        fired = []
        try:
            from app.services.intelligence.collections_service import CollectionsIntelligenceService
            col = CollectionsIntelligenceService(self.session).analyze(company_id)
            if col.get('available'):
                overdue = (col.get('aging', {}).get('d61_90', 0) + col.get('aging', {}).get('d90_plus', 0))
                if overdue > 0:
                    self.send_event_alert(company_id, "Overdue payments need chasing",
                                          f"You have approximately ₹{overdue:,.0f} unpaid for 60+ days. Follow up today.",
                                          cooldown_days=3)
                    fired.append('collections')
        except Exception:
            pass
        try:
            from app.services.intelligence.compliance_service import ComplianceIntelligenceService
            comp = ComplianceIntelligenceService(self.session).analyze(company_id)
            if comp.get('available'):
                for d in comp.get('upcoming', []):
                    if d.get('status') == 'due_soon':
                        self.send_event_alert(company_id, f"Filing due soon: {d['title']}",
                                              f"{d['title']} is due on {d['due_date']}. Prepare and file to avoid penalties.",
                                              cooldown_days=7)
                        fired.append('compliance')
                        break
        except Exception:
            pass
        try:
            from app.services.upload_freshness_service import UploadFreshnessService
            fresh = UploadFreshnessService(self.session).status(company_id)
            if fresh.get('status') == 'overdue':
                self.send_event_alert(company_id, "Your data is out of date",
                                      fresh.get('message', 'Upload fresh data to keep insights accurate.'),
                                      cooldown_days=7)
                fired.append('freshness')
        except Exception:
            pass
        return {'fired': fired}
