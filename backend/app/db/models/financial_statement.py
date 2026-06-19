import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class FinancialStatementLine(Base):
    """A single normalized line item from a Balance Sheet or Profit &
    Loss statement. One row per line per statement -- e.g. one upload of
    a balance sheet produces many rows here, one per line item.
    """

    __tablename__ = 'financial_statement_lines'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='SET NULL'), nullable=True, index=True)

    # balance_sheet | profit_and_loss
    statement_type = Column(String(32), nullable=False, index=True)
    statement_date = Column(Date, nullable=False, index=True)

    # Controlled vocabulary -- see ingestion/normalization_service.py's
    # classify_line_category for the exact allowed values
    # (current_assets, inventory_assets, fixed_assets,
    # current_liabilities, long_term_liabilities, equity, revenue, cogs,
    # operating_expenses, other_income, other_expenses).
    line_category = Column(String(64), nullable=False, index=True)
    line_label = Column(String(256), nullable=False)  # original label, e.g. "Sundry Debtors"
    amount = Column(Numeric(16, 2), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship('Company', back_populates='financial_statement_lines')
    source_file = relationship('File', back_populates='financial_statement_lines')
