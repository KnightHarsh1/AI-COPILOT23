import uuid
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class Company(Base):
    __tablename__ = 'companies'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(256), nullable=False, unique=True, index=True)
    domain = Column(String(256), nullable=True)
    industry = Column(String(128), nullable=True)
    plan = Column(String(64), nullable=False, default='starter')
    is_active = Column(Boolean, default=True, nullable=False)
    # Compliance Intelligence profile (additive).
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=True)
    gst_filing_frequency = Column(String(16), nullable=False, default='monthly')
    compliance_enabled = Column(Boolean, default=True, nullable=False)
    # Upload frequency preference + freshness tracking (additive).
    upload_frequency = Column(String(16), nullable=False, default='monthly')  # daily|weekly|monthly|quarterly|yearly
    last_data_upload_at = Column(DateTime(timezone=True), nullable=True)
    # Business profile for Market Radar personalization + goals (additive).
    sub_industry = Column(String(128), nullable=True)
    primary_cost_driver = Column(String(64), nullable=True)  # e.g. raw_material, labour, logistics
    monthly_revenue_goal = Column(String(32), nullable=True)
    business_goal = Column(String(64), nullable=True)  # grow_revenue | improve_margin | reduce_risk | expand
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    users = relationship('User', back_populates='company', cascade='all, delete-orphan')
    files = relationship('File', back_populates='company', cascade='all, delete-orphan')
    sales = relationship('Sale', back_populates='company', cascade='all, delete-orphan')
    expenses = relationship('Expense', back_populates='company', cascade='all, delete-orphan')
    inventory_items = relationship('InventoryItem', back_populates='company', cascade='all, delete-orphan')
    customers = relationship('Customer', back_populates='company', cascade='all, delete-orphan')
    metrics = relationship('Metric', back_populates='company', cascade='all, delete-orphan')
    alerts = relationship('Alert', back_populates='company', cascade='all, delete-orphan')
    reports = relationship('Report', back_populates='company', cascade='all, delete-orphan')
    recommendations = relationship('Recommendation', back_populates='company', cascade='all, delete-orphan')
    ingestion_batches = relationship('IngestionBatch', back_populates='company', cascade='all, delete-orphan')
    column_mapping_templates = relationship('ColumnMappingTemplate', back_populates='company', cascade='all, delete-orphan')
    financial_statement_lines = relationship('FinancialStatementLine', back_populates='company', cascade='all, delete-orphan')
    bank_transactions = relationship('BankTransaction', back_populates='company', cascade='all, delete-orphan')
    compliance_deadlines = relationship('ComplianceDeadline', back_populates='company', cascade='all, delete-orphan')
    market_insights = relationship('UserMarketInsight', back_populates='company', cascade='all, delete-orphan')
    goals = relationship('Goal', back_populates='company', cascade='all, delete-orphan')
    audit_logs = relationship('AuditLog', back_populates='company', cascade='all, delete-orphan')
    team_members = relationship('TeamMember', back_populates='company', cascade='all, delete-orphan')
