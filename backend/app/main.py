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


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
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
