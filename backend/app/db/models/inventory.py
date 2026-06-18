import uuid
from sqlalchemy import Column, DateTime, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class InventoryItem(Base):
    __tablename__ = 'inventory_items'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    product_name = Column(String(256), nullable=False)
    sku = Column(String(64), nullable=True, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Numeric(14, 2), nullable=False, default=0.0)
    reorder_level = Column(Integer, nullable=False, default=0)
    location = Column(String(128), nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    company = relationship('Company', back_populates='inventory_items')
