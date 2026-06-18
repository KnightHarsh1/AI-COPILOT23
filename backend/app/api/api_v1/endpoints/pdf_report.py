from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.models.user import User

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)

from app.services.ai_service import AIService
from app.services.pdf_service import PDFService

router = APIRouter()


@router.get("/")
def pdf_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ai_service = AIService(db)

    report = ai_service.generate_monthly_report(
        current_user.company_id
    )

    filename = PDFService.generate_report(report)

    file_path = Path("generated_reports") / filename

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/pdf"
    )