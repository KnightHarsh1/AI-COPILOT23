import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class PurchaseRecord(Base):
    """Purchase / GSTR-2B line — the inward-supply side of GST, needed to
    compute real Input Tax Credit and reconcile against outward GSTR-1 / 3B.

    Populated from an uploaded purchase register or GSTR-2B export. Each row is
    one inward invoice with its tax components, so ITC = Σ total_tax and
    reconciliation can compare booked vs filed.
    """
    __tablename__ = 'purchase_records'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    invoice_number = Column(String(128), nullable=True)
    invoice_date = Column(Date, nullable=True, index=True)
    supplier_name = Column(String(255), nullable=True)
    supplier_gstin = Column(String(20), nullable=True)
    taxable_value = Column(Numeric(16, 2), nullable=True)
    cgst = Column(Numeric(16, 2), nullable=True)
    sgst = Column(Numeric(16, 2), nullable=True)
    igst = Column(Numeric(16, 2), nullable=True)
    total_tax = Column(Numeric(16, 2), nullable=True)
    source = Column(String(32), nullable=True)  # purchase_register | gstr_2b | gstr_3b
    period_label = Column(String(16), nullable=True)  # e.g. 2026-05
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
