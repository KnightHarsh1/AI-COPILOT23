"""Background scheduler.

Prefers APScheduler (proper cron-like jobs) when installed; falls back to a
dependency-free daemon thread otherwise. A process-level advisory lock file
ensures only ONE worker runs the jobs even under `uvicorn --workers N`, so
digests/alerts don't double-fire. Swappable for Celery in a larger
deployment without touching the dispatcher.
"""

import atexit
import os
import tempfile
import threading
import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger('scheduler')

_DAY = 24 * 60 * 60
_WEEK = 7 * _DAY
_LOCK_PATH = os.path.join(tempfile.gettempdir(), 'business_copilot_scheduler.lock')


def _acquire_singleton_lock() -> bool:
    """Best-effort cross-process lock so only one worker schedules jobs."""
    try:
        fd = os.open(_LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_RDWR)
        os.write(fd, str(os.getpid()).encode())
        atexit.register(lambda: (os.close(fd), os.path.exists(_LOCK_PATH) and os.remove(_LOCK_PATH)))
        return True
    except FileExistsError:
        # Stale lock from a dead process? Reclaim it.
        try:
            with open(_LOCK_PATH) as fh:
                pid = int((fh.read() or '0').strip() or 0)
            if pid and not _pid_alive(pid):
                os.remove(_LOCK_PATH)
                return _acquire_singleton_lock()
        except Exception:
            pass
        return False
    except Exception:
        return True  # If locking isn't available, don't block startup.


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _run_daily():
    from app.db.session import SessionLocal
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.db.models.company import Company
    session = SessionLocal()
    try:
        for (cid,) in session.query(Company.id).all():
            try:
                NotificationDispatcher(session).run_daily_checks(cid)
            except Exception:
                session.rollback()
        logger.info('daily checks done at %s', datetime.now(timezone.utc).isoformat())
    finally:
        session.close()


def _run_weekly():
    from app.db.session import SessionLocal
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.db.models.company import Company
    session = SessionLocal()
    try:
        for (cid,) in session.query(Company.id).all():
            try:
                NotificationDispatcher(session).send_weekly_digest(cid)
            except Exception:
                session.rollback()
        logger.info('weekly digests sent at %s', datetime.now(timezone.utc).isoformat())
    finally:
        session.close()


class BackgroundScheduler:
    def __init__(self):
        self._stop = threading.Event()
        self._thread = None
        self._last_daily = 0.0
        self._last_weekly = 0.0
        self._aps = None

    def start(self):
        if not _acquire_singleton_lock():
            logger.info('Another worker owns the scheduler; this worker will not schedule.')
            return
        # Prefer APScheduler if available.
        try:
            from apscheduler.schedulers.background import BackgroundScheduler as APS
            from apscheduler.triggers.cron import CronTrigger
            self._aps = APS(timezone='UTC')
            self._aps.add_job(_run_daily, CronTrigger(hour=6, minute=0), id='daily', replace_existing=True)
            self._aps.add_job(_run_weekly, CronTrigger(day_of_week='mon', hour=7, minute=0), id='weekly', replace_existing=True)
            self._aps.start()
            logger.info('APScheduler started')
            return
        except Exception:
            self._aps = None
        # Fallback: dependency-free daemon thread.
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, daemon=True, name='bc-scheduler')
        self._thread.start()
        logger.info('Thread scheduler started (APScheduler not installed)')

    def stop(self):
        self._stop.set()
        if self._aps:
            try:
                self._aps.shutdown(wait=False)
            except Exception:
                pass

    def _run(self):
        time.sleep(15)
        while not self._stop.is_set():
            now = time.time()
            try:
                if now - self._last_daily >= _DAY:
                    _run_daily()
                    self._last_daily = now
                if now - self._last_weekly >= _WEEK:
                    _run_weekly()
                    self._last_weekly = now
            except Exception as exc:  # noqa: BLE001
                logger.warning('scheduler tick error: %s', exc)
            self._stop.wait(1800)


scheduler = BackgroundScheduler()
