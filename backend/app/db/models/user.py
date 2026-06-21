import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    email = Column(String(256), unique=True, nullable=False, index=True)
    first_name = Column(String(128), nullable=True)
    last_name = Column(String(128), nullable=True)
    hashed_password = Column(String(256), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Theme & display preferences
    theme = Column(String(16), nullable=False, default='system')
    appearance_preferences = Column(JSON, nullable=True)  # dashboard theme, health style/skin, custom layout

    # Notification preferences
    email_alerts_enabled = Column(Boolean, default=True, nullable=False)
    risk_alerts_enabled = Column(Boolean, default=True, nullable=False)
    weekly_reports_enabled = Column(Boolean, default=True, nullable=False)

    # AI preferences
    ai_personality = Column(String(32), nullable=False, default='balanced')
    ai_report_style = Column(String(32), nullable=False, default='concise')
    ai_summary_length = Column(String(16), nullable=False, default='medium')

    # Profile picture: either an uploaded image path or a chosen preset avatar id.
    # Text (not String) so an uploaded image data-URL fits; a preset id
    # or external URL also fits comfortably.
    avatar_url = Column(Text, nullable=True)
    avatar_preset = Column(String(32), nullable=True)

    # Risk appetite preference influences alert thresholds in the UI copy.
    risk_appetite = Column(String(16), nullable=False, default='balanced')  # cautious | balanced | aggressive
    phone = Column(String(20), nullable=True)
    team_role = Column(String(24), nullable=False, default='owner')

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='users')
    files = relationship('File', back_populates='uploader', cascade='all, delete-orphan')
    generated_reports = relationship('Report', back_populates='generated_by', cascade='all, delete-orphan')
    generated_recommendations = relationship('Recommendation', back_populates='generated_by', cascade='all, delete-orphan')

    @property
    def company_name(self):
        return self.company.name if self.company else None
