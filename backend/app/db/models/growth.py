import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class Goal(Base):
    """A business goal an owner sets (revenue/profit/collection target) with
    a period. Progress is computed live from KPIs, not stored."""
    __tablename__ = 'goals'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    goal_type = Column(String(32), nullable=False)  # revenue | profit | collection
    target_amount = Column(Numeric(16, 2), nullable=False)
    period = Column(String(16), nullable=False, default='monthly')  # monthly | quarterly | yearly
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship('Company', back_populates='goals')


class AuditLog(Base):
    """Trust feature: a timeline of meaningful events (imports, goal changes,
    profile edits) so owners can see what changed and when."""
    __tablename__ = 'audit_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    event_type = Column(String(48), nullable=False)  # import | goal | profile | compliance | settings
    title = Column(String(256), nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    company = relationship('Company', back_populates='audit_logs')


class TeamMember(Base):
    """A team member invited to a company with a role. Foundation for
    accountant / manager / read-only access."""
    __tablename__ = 'team_members'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    name = Column(String(128), nullable=True)
    role = Column(String(24), nullable=False, default='read_only')  # owner | accountant | manager | read_only
    status = Column(String(16), nullable=False, default='invited')  # invited | active
    invited_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship('Company', back_populates='team_members')
