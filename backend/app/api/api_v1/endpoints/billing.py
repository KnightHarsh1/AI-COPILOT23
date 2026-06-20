from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db, require_role
from app.db.models.user import User
from app.services.billing_service import BillingService

router = APIRouter()


@router.get('/status')
def billing_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return BillingService(db).status(current_user.company_id)


class OrderRequest(BaseModel):
    plan: str


@router.post('/order')
def create_order(payload: OrderRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role('owner'))):
    return BillingService(db).create_order(current_user.company_id, payload.plan)


class ActivateRequest(BaseModel):
    plan: str
    payment_id: Optional[str] = None
    signature: Optional[str] = None


@router.post('/activate')
def activate(payload: ActivateRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role('owner'))):
    return BillingService(db).activate(current_user.company_id, payload.plan, payload.payment_id, payload.signature)


@router.post('/cancel')
def cancel(db: Session = Depends(get_db), current_user: User = Depends(require_role('owner'))):
    return BillingService(db).cancel(current_user.company_id)


@router.get('/invoices')
def invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return {'invoices': BillingService(db).invoices(current_user.company_id)}
