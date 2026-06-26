from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.user import User
from app.services.intelligence.working_capital_service import WorkingCapitalService
from app.services.intelligence.forecasting_service import ForecastingService
from app.services.intelligence.risk_intelligence_service import RiskIntelligenceService
from app.services.intelligence.executive_intelligence_service import ExecutiveIntelligenceService

router = APIRouter()


@router.get('/working-capital')
def working_capital(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return WorkingCapitalService(db).analyze(current_user.company_id)


@router.get('/forecasting')
def forecasting(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return ForecastingService(db).analyze(current_user.company_id)


@router.get('/risk')
def risk(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return RiskIntelligenceService(db).analyze(current_user.company_id)


@router.get('/executive')
def executive(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return ExecutiveIntelligenceService(db).analyze(current_user.company_id)


@router.get('/gst-reconciliation')
def gst_reconciliation(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from app.services.intelligence.gst_reconciliation_service import GSTReconciliationService
    return GSTReconciliationService(db).analyze(current_user.company_id)


@router.post('/gst-purchase')
def add_purchase_records(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Ingest purchase / GSTR-2B rows for ITC + reconciliation. Accepts
    {records: [{invoice_number, invoice_date, supplier_name, supplier_gstin,
    taxable_value, cgst, sgst, igst, total_tax, period_label}]}."""
    from datetime import datetime
    from app.db.models.purchase_record import PurchaseRecord
    records = payload.get('records') or []
    added = 0
    for r in records:
        inv_date = None
        if r.get('invoice_date'):
            try:
                inv_date = datetime.fromisoformat(str(r['invoice_date'])[:10]).date()
            except Exception:
                inv_date = None
        total_tax = r.get('total_tax')
        if total_tax in (None, ''):
            total_tax = (r.get('cgst') or 0) + (r.get('sgst') or 0) + (r.get('igst') or 0)
        db.add(PurchaseRecord(
            company_id=current_user.company_id,
            invoice_number=r.get('invoice_number'), invoice_date=inv_date,
            supplier_name=r.get('supplier_name'), supplier_gstin=r.get('supplier_gstin'),
            taxable_value=r.get('taxable_value'), cgst=r.get('cgst'), sgst=r.get('sgst'),
            igst=r.get('igst'), total_tax=total_tax, source=r.get('source', 'purchase_register'),
            period_label=r.get('period_label'),
        ))
        added += 1
    db.commit()
    return {'added': added}
