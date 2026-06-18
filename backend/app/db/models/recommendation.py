import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, JSONB, UUID


class Recommendation(Base):
    __tablename__ = 'recommendations'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    generated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    recommendation_type = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    reason = Column(Text, nullable=False)
    actions = Column(JSONB, nullable=False)
    priority = Column(String(16), nullable=False, default='medium')
    expected_impact = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default='open')
    generated_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='recommendations')
    generated_by = relationship('User', back_populates='generated_recommendations')
