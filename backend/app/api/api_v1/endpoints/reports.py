from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.user import User
from app.schemas.report import ReportGenerateRequest, ReportListResponse, ReportResponse
from app.services.report_service import ReportService

router = APIRouter()


@router.post('/generate', response_model=ReportResponse)
def generate_report(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)

    try:
        report = service.generate_report(
            company_id=current_user.company_id,
            generated_by_id=current_user.id,
            report_type=request.report_type,
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return report


@router.get('/', response_model=ReportListResponse)
def list_reports(
    report_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)

    reports = service.list_reports(
        current_user.company_id,
        report_type=report_type
    )

    return {'reports': reports}


@router.get('/{report_id}', response_model=ReportResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = ReportService(db)

    report = service.get_report(
        current_user.company_id,
        report_id
    )

    if report is None:
        raise HTTPException(status_code=404, detail='Report not found')

    return report
