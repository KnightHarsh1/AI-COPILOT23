"""Notification delivery. A pluggable foundation: if SMTP / WhatsApp
credentials are configured in settings they're used; otherwise notifications
are recorded (logged) so the pipeline works end-to-end and can be wired to a
real provider without code changes. This turns the existing notification
toggles into a real delivery system.
"""

import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger('notifications')


class NotificationService:
    def _smtp_configured(self) -> bool:
        return bool(getattr(settings, 'smtp_host', None) and getattr(settings, 'smtp_user', None))

    def _whatsapp_configured(self) -> bool:
        return bool(getattr(settings, 'whatsapp_api_url', None) and getattr(settings, 'whatsapp_api_token', None))

    def send_email(self, to_email: str, subject: str, body: str) -> dict:
        if not to_email:
            return {'sent': False, 'channel': 'email', 'reason': 'no recipient'}
        if not self._smtp_configured():
            logger.info('EMAIL (not configured) -> %s | %s', to_email, subject)
            return {'sent': False, 'channel': 'email', 'reason': 'smtp not configured', 'queued': True}
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = settings.smtp_user
            msg['To'] = to_email
            with smtplib.SMTP(settings.smtp_host, getattr(settings, 'smtp_port', 587)) as server:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
            return {'sent': True, 'channel': 'email'}
        except Exception as exc:  # noqa: BLE001
            logger.warning('email send failed: %s', exc)
            return {'sent': False, 'channel': 'email', 'reason': str(exc)}

    def send_whatsapp(self, to_phone: str, body: str) -> dict:
        if not to_phone:
            return {'sent': False, 'channel': 'whatsapp', 'reason': 'no recipient'}
        if not self._whatsapp_configured():
            logger.info('WHATSAPP (not configured) -> %s | %s', to_phone, body[:60])
            return {'sent': False, 'channel': 'whatsapp', 'reason': 'whatsapp not configured', 'queued': True}
        try:
            import requests
            resp = requests.post(
                settings.whatsapp_api_url,
                headers={'Authorization': f'Bearer {settings.whatsapp_api_token}'},
                json={'to': to_phone, 'type': 'text', 'text': {'body': body}},
                timeout=10,
            )
            return {'sent': resp.ok, 'channel': 'whatsapp', 'status': resp.status_code}
        except Exception as exc:  # noqa: BLE001
            logger.warning('whatsapp send failed: %s', exc)
            return {'sent': False, 'channel': 'whatsapp', 'reason': str(exc)}
