from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
from app.db.models.company import Company
from app.db.models.user import User
from app.services.command_center_service import CommandCenterService
from app.services.intelligence.compliance_calendar import ComplianceCalendarGenerator

router = APIRouter()


@router.get('')
def get_command_center(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    service = CommandCenterService(db)
    return service.build(current_user.company_id, user=current_user)


class ComplianceProfileUpdate(BaseModel):
    gstin: Optional[str] = None
    pan: Optional[str] = None
    gst_filing_frequency: Optional[str] = None
    compliance_enabled: Optional[bool] = None


class BusinessProfileUpdate(BaseModel):
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    primary_cost_driver: Optional[str] = None
    upload_frequency: Optional[str] = None
    monthly_revenue_goal: Optional[str] = None
    business_goal: Optional[str] = None


@router.get('/freshness')
def get_upload_freshness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.upload_freshness_service import UploadFreshnessService
    return UploadFreshnessService(db).status(current_user.company_id)


@router.patch('/business-profile')
def update_business_profile(
    payload: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    company = db.query(Company).filter(Company.id == current_user.company_id).one_or_none()
    if company is None:
        return {'updated': False}
    if payload.industry is not None:
        company.industry = payload.industry.strip() or None
    if payload.sub_industry is not None:
        company.sub_industry = payload.sub_industry.strip() or None
    if payload.primary_cost_driver is not None:
        company.primary_cost_driver = payload.primary_cost_driver
    if payload.upload_frequency is not None:
        company.upload_frequency = payload.upload_frequency
    if payload.monthly_revenue_goal is not None:
        company.monthly_revenue_goal = payload.monthly_revenue_goal
    if payload.business_goal is not None:
        company.business_goal = payload.business_goal
    db.commit()
    return {
        'updated': True,
        'industry': company.industry,
        'sub_industry': company.sub_industry,
        'upload_frequency': company.upload_frequency,
        'business_goal': company.business_goal,
        'monthly_revenue_goal': company.monthly_revenue_goal,
        'primary_cost_driver': company.primary_cost_driver,
    }


@router.patch('/compliance-profile')
def update_compliance_profile(
    payload: ComplianceProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    company = db.query(Company).filter(Company.id == current_user.company_id).one_or_none()
    if company is None:
        return {'updated': False}

    if payload.gstin is not None:
        company.gstin = payload.gstin.strip() or None
    if payload.pan is not None:
        company.pan = payload.pan.strip() or None
    if payload.gst_filing_frequency is not None:
        company.gst_filing_frequency = payload.gst_filing_frequency
    if payload.compliance_enabled is not None:
        company.compliance_enabled = payload.compliance_enabled
    db.commit()

    # Regenerate the deadline calendar now that the profile changed.
    written = 0
    if company.gstin and company.compliance_enabled:
        written = ComplianceCalendarGenerator(db).generate_for_company(current_user.company_id)

    return {
        'updated': True,
        'gstin': company.gstin,
        'pan': company.pan,
        'gst_filing_frequency': company.gst_filing_frequency,
        'compliance_enabled': company.compliance_enabled,
        'deadlines_generated': written,
    }
