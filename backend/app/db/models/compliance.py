import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class ComplianceDeadline(Base):
    """A single statutory filing deadline (GST, TDS, advance tax, ITR)
    for a company. Generated from standard Indian filing-cadence rules
    by ComplianceCalendarGenerator, not manual entry, so the widget is
    useful the moment a GSTIN is added to the company profile.
    """

    __tablename__ = 'compliance_deadlines'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)

    # gstr1 | gstr3b | tds | advance_tax | itr
    deadline_type = Column(String(32), nullable=False)
    title = Column(String(256), nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    # upcoming | due_soon | overdue | filed
    status = Column(String(16), nullable=False, default='upcoming')
    period_label = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='compliance_deadlines')
