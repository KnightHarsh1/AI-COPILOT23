from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)
from app.db.models.user import User
from app.schemas.alert import AlertListResponse, AlertResponse
from app.services.alert_service import AlertService

router = APIRouter()


@router.post('/generate', response_model=AlertListResponse)
def generate_alerts(
    status: Optional[str] = Query(None, description='Filter existing alerts by status after generation'),
    severity: Optional[str] = Query(None, description='Filter existing alerts by severity after generation'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = AlertService(db)
    service.generate_alerts(company_id=current_user.company_id)

    alerts = service.list_alerts(
        current_user.company_id,
        status=status,
        severity=severity
    )

    return {'alerts': alerts}


@router.get('/', response_model=AlertListResponse)
def list_alerts(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = AlertService(db)

    alerts = service.list_alerts(
        current_user.company_id,
        status=status,
        severity=severity
    )

    return {'alerts': alerts}


@router.get('/{alert_id}', response_model=AlertResponse)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = AlertService(db)
    alert = service.get_alert(current_user.company_id, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail='Alert not found')
    return alert