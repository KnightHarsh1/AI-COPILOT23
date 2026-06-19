import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class File(Base):
    __tablename__ = 'files'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    file_hash = Column(String(64), nullable=True, index=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    original_filename = Column(String(256), nullable=False)
    stored_filename = Column(String(256), nullable=False, unique=True)
    content_type = Column(String(128), nullable=False)
    size = Column(Integer, nullable=False)
    path = Column(String(512), nullable=False)
    status = Column(String(32), nullable=False, default='uploaded')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='files')
    uploader = relationship('User', back_populates='files')
    receipt_expenses = relationship('Expense', back_populates='receipt_file', foreign_keys='Expense.receipt_file_id')
    reports = relationship('Report', back_populates='file', foreign_keys='Report.file_id')
    ingestion_batches = relationship('IngestionBatch', back_populates='file', cascade='all, delete-orphan')
    financial_statement_lines = relationship('FinancialStatementLine', back_populates='source_file')
    bank_transactions = relationship('BankTransaction', back_populates='source_file')
