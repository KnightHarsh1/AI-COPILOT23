import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class Sale(Base):
    __tablename__ = 'sales'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey('customers.id', ondelete='SET NULL'), nullable=True, index=True)
    customer_name = Column(String(256), nullable=True, index=True)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='SET NULL'), nullable=True, index=True)
    invoice_number = Column(String(64), nullable=True, unique=True)
    invoice_date = Column(Date, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(8), nullable=False, default='USD')
    category = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    # Collections Intelligence fields (additive). Default 'unknown' so
    # historical sales imported without payment info are honestly marked
    # as such rather than silently assumed paid or overdue.
    due_date = Column(Date, nullable=True)
    payment_status = Column(String(16), nullable=False, default='unknown')
    amount_paid = Column(Numeric(14, 2), nullable=False, default=0)
    is_credit_sale = Column(Boolean, nullable=False, default=False)
    # GST tax detail — populated from GST R1 imports. Nullable so non-GST
    # sales are unaffected; enables GST liability/health computation.
    taxable_value = Column(Numeric(16, 2), nullable=True)
    cgst = Column(Numeric(16, 2), nullable=True)
    sgst = Column(Numeric(16, 2), nullable=True)
    igst = Column(Numeric(16, 2), nullable=True)
    total_tax = Column(Numeric(16, 2), nullable=True)
    paid_date = Column(Date, nullable=True)
    # Product Intelligence link (additive).
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey('inventory_items.id', ondelete='SET NULL'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='sales')
    customer = relationship('Customer', back_populates='sales')
    source_file = relationship('File', foreign_keys=[source_file_id])
