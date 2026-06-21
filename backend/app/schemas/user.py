from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, constr


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    password: constr(min_length=8)
    company_id: Optional[UUID] = None
    company_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class UserRead(UserBase):
    id: UUID
    company_id: UUID
    company_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    theme: str = 'system'
    appearance_preferences: Optional[dict] = None
    email_alerts_enabled: bool = True
    risk_alerts_enabled: bool = True
    weekly_reports_enabled: bool = True
    ai_personality: str = 'balanced'
    ai_report_style: str = 'concise'
    ai_summary_length: str = 'medium'
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    risk_appetite: str = 'balanced'
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: constr(min_length=8)


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    appearance_preferences: Optional[dict] = None
    email_alerts_enabled: Optional[bool] = None
    risk_alerts_enabled: Optional[bool] = None
    weekly_reports_enabled: Optional[bool] = None
    ai_personality: Optional[str] = None
    ai_report_style: Optional[str] = None
    ai_summary_length: Optional[str] = None
    risk_appetite: Optional[str] = None
