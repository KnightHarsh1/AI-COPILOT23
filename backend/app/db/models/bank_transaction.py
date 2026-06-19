import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class BankTransaction(Base):
    """A single normalized bank statement transaction row."""

    __tablename__ = 'bank_transactions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='SET NULL'), nullable=True, index=True)

    bank_name = Column(String(128), nullable=True)
    # Last 4 digits only -- never store a full account number.
    account_number_masked = Column(String(8), nullable=True)

    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=True)
    debit_amount = Column(Numeric(16, 2), nullable=True)
    credit_amount = Column(Numeric(16, 2), nullable=True)
    balance_after = Column(Numeric(16, 2), nullable=True)
    category = Column(String(64), nullable=True)

    reconciled_sale_id = Column(UUID(as_uuid=True), ForeignKey('sales.id', ondelete='SET NULL'), nullable=True)
    reconciled_expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id', ondelete='SET NULL'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship('Company', back_populates='bank_transactions')
    source_file = relationship('File', back_populates='bank_transactions')
    reconciled_sale = relationship('Sale', foreign_keys=[reconciled_sale_id])
    reconciled_expense = relationship('Expense', foreign_keys=[reconciled_expense_id])
