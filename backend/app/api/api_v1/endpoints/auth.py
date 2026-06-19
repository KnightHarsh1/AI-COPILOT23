from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import uuid4

from app.api.api_v1.dependencies import get_db, get_current_active_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.models.company import Company
from app.db.models.user import User
from app.schemas.token import TokenWithUser
from app.schemas.user import (
    PasswordChangeRequest,
    PasswordResetRequest,
    UserCreate,
    UserLogin,
    UserPreferencesUpdate,
    UserProfileUpdate,
    UserRead,
)

router = APIRouter()

VALID_THEMES = {'light', 'dark', 'system'}
VALID_PERSONALITIES = {'direct', 'balanced', 'encouraging', 'analytical'}
VALID_REPORT_STYLES = {'concise', 'detailed', 'executive'}
VALID_SUMMARY_LENGTHS = {'short', 'medium', 'long'}


@router.post('/register', response_model=TokenWithUser, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Email is already registered.'
        )

    company = None
    if user_in.company_id:
        company = db.query(Company).filter(Company.id == user_in.company_id).first()

    if company is None:
        # Every user must belong to a real Company row — a bare random UUID
        # with no matching company would violate the foreign key constraint
        # on Postgres in production.
        default_name = user_in.company_name or f"{(user_in.first_name or 'My').strip()}'s Company"
        company = Company(id=uuid4(), name=default_name)
        db.add(company)
        db.flush()

    user = User(
        id=uuid4(),
        company_id=company.id,
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        hashed_password=get_password_hash(user_in.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        subject=user.email,
        company_id=str(user.company_id)
    )

    return {
        'access_token': access_token,
        'token_type': 'bearer',
        'user': user
    }


@router.post('/login', response_model=TokenWithUser)
def login(form_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.email).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect email or password.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Inactive user.'
        )

    token = create_access_token(
        subject=user.email,
        company_id=str(user.company_id)
    )

    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': user
    }


@router.post('/forgot-password')
def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    db.query(User).filter(User.email == request.email).first()

    return {
        'message': 'If that email exists, password reset instructions will be sent.'
    }


@router.get('/me', response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.patch('/profile', response_model=UserRead)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if payload.email and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Email is already in use.',
            )
        current_user.email = payload.email

    if payload.first_name is not None:
        current_user.first_name = payload.first_name
    if payload.last_name is not None:
        current_user.last_name = payload.last_name
    if payload.company_name is not None and current_user.company is not None:
        current_user.company.name = payload.company_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url or None
    if payload.avatar_preset is not None:
        current_user.avatar_preset = payload.avatar_preset or None

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post('/change-password')
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Current password is incorrect.',
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {'message': 'Password updated successfully.'}


@router.patch('/preferences', response_model=UserRead)
def update_preferences(
    payload: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if payload.theme is not None:
        if payload.theme not in VALID_THEMES:
            raise HTTPException(status_code=400, detail=f"theme must be one of {sorted(VALID_THEMES)}")
        current_user.theme = payload.theme

    if payload.ai_personality is not None:
        if payload.ai_personality not in VALID_PERSONALITIES:
            raise HTTPException(status_code=400, detail=f"ai_personality must be one of {sorted(VALID_PERSONALITIES)}")
        current_user.ai_personality = payload.ai_personality

    if payload.ai_report_style is not None:
        if payload.ai_report_style not in VALID_REPORT_STYLES:
            raise HTTPException(status_code=400, detail=f"ai_report_style must be one of {sorted(VALID_REPORT_STYLES)}")
        current_user.ai_report_style = payload.ai_report_style

    if payload.ai_summary_length is not None:
        if payload.ai_summary_length not in VALID_SUMMARY_LENGTHS:
            raise HTTPException(status_code=400, detail=f"ai_summary_length must be one of {sorted(VALID_SUMMARY_LENGTHS)}")
        current_user.ai_summary_length = payload.ai_summary_length

    if payload.email_alerts_enabled is not None:
        current_user.email_alerts_enabled = payload.email_alerts_enabled
    if payload.risk_alerts_enabled is not None:
        current_user.risk_alerts_enabled = payload.risk_alerts_enabled
    if payload.weekly_reports_enabled is not None:
        current_user.weekly_reports_enabled = payload.weekly_reports_enabled
    if payload.risk_appetite is not None:
        current_user.risk_appetite = payload.risk_appetite

    db.commit()
    db.refresh(current_user)
    return current_user
