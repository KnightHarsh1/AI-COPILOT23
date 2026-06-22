import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
import app.db.models  # noqa: F401

app = FastAPI(
    title="Business Copilot API",
    version="1.0.0",
    description="AI-powered Business Copilot backend",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    ALLOWED_ORIGINS.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ensure_missing_columns():
    """Lightweight schema self-heal: for every mapped table, add any column
    that exists on the model but is missing from the database. This covers the
    common case where a new column was added in code but the matching Alembic
    migration hasn't been run yet (e.g. SQLite dev databases), which otherwise
    makes every query on that table fail with 'no such column'.

    Only ADDs nullable columns — never drops or alters — so it is safe. Real
    schema changes still belong in migrations; this is a guard rail."""
    import logging
    from sqlalchemy import inspect as sa_inspect, text

    log = logging.getLogger('startup')
    try:
        inspector = sa_inspect(engine)
    except Exception:
        return

    # Map SQLAlchemy column types to SQL type strings that work on SQLite +
    # Postgres for the simple types we add.
    def _sql_type(col):
        try:
            return col.type.compile(dialect=engine.dialect)
        except Exception:
            return 'VARCHAR'

    for table in Base.metadata.sorted_tables:
        try:
            existing = {c['name'] for c in inspector.get_columns(table.name)}
        except Exception:
            continue
        if not existing:
            continue  # table doesn't exist yet; create_all handles it
        for col in table.columns:
            if col.name in existing:
                continue
            # Only auto-add nullable columns (or those with a default); adding a
            # NOT NULL column without a default to a populated table would fail.
            if not col.nullable and col.default is None and col.server_default is None:
                log.warning(
                    "Column %s.%s is missing and NOT NULL — run migrations to add it.",
                    table.name, col.name,
                )
                continue
            ddl = f'ALTER TABLE {table.name} ADD COLUMN {col.name} {_sql_type(col)}'
            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                log.warning("Auto-added missing column %s.%s", table.name, col.name)
            except Exception as exc:
                log.warning("Could not auto-add %s.%s: %s", table.name, col.name, exc)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    _ensure_missing_columns()
    # Surface optional import dependencies early so missing libs show up in
    # server logs, not as a confused user mid-upload.
    import logging
    _log = logging.getLogger('startup')
    try:
        import pdfplumber  # noqa: F401
    except Exception:
        _log.warning("pdfplumber not installed — PDF import disabled. Run: pip install -r requirements.txt")
    try:
        import pytesseract  # noqa: F401
    except Exception:
        _log.warning("pytesseract not installed — photo/OCR import disabled.")
    if getattr(settings, 'scheduler_enabled', True):
        try:
            from app.services.scheduler import scheduler
            scheduler.start()
        except Exception:
            pass


app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Business Copilot API is running.", "version": "1.0.0"}


@app.get("/api/v1/ping")
def ping():
    return {"status": "ok"}
