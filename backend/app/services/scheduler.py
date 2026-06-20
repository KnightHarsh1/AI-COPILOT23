"""Lightweight background scheduler with no external dependencies.

Runs two recurring jobs in a daemon thread:
  - daily: per-company event checks (overdue collections, compliance due,
    stale data) -> notifications
  - weekly: per-company weekly digest -> notifications

Uses threading only, so it needs no Celery/APScheduler install and starts
with the app. Each company is processed independently and best-effort.
A real deployment can swap this for Celery/APScheduler later without
touching the dispatcher.
"""

import threading
import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger('scheduler')

_DAY = 24 * 60 * 60
_WEEK = 7 * _DAY


class BackgroundScheduler:
    def __init__(self):
        self._stop = threading.Event()
        self._thread = None
        self._last_daily = 0.0
        self._last_weekly = 0.0

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, daemon=True, name='bc-scheduler')
        self._thread.start()
        logger.info('Background scheduler started')

    def stop(self):
        self._stop.set()

    def _run(self):
        # Small initial delay so app startup completes first.
        time.sleep(15)
        while not self._stop.is_set():
            now = time.time()
            try:
                if now - self._last_daily >= _DAY:
                    self._run_daily()
                    self._last_daily = now
                if now - self._last_weekly >= _WEEK:
                    self._run_weekly()
                    self._last_weekly = now
            except Exception as exc:  # noqa: BLE001
                logger.warning('scheduler tick error: %s', exc)
            # Check every 30 min.
            self._stop.wait(1800)

    def _companies(self, session):
        from app.db.models.company import Company
        return [c.id for c in session.query(Company).all()]

    def _run_daily(self):
        from app.db.session import SessionLocal
        from app.services.notification_dispatcher import NotificationDispatcher
        session = SessionLocal()
        try:
            for cid in self._companies(session):
                try:
                    NotificationDispatcher(session).run_daily_checks(cid)
                except Exception:
                    session.rollback()
            logger.info('daily checks done at %s', datetime.now(timezone.utc).isoformat())
        finally:
            session.close()

    def _run_weekly(self):
        from app.db.session import SessionLocal
        from app.services.notification_dispatcher import NotificationDispatcher
        session = SessionLocal()
        try:
            for cid in self._companies(session):
                try:
                    NotificationDispatcher(session).send_weekly_digest(cid)
                except Exception:
                    session.rollback()
            logger.info('weekly digests sent at %s', datetime.now(timezone.utc).isoformat())
        finally:
            session.close()


scheduler = BackgroundScheduler()
