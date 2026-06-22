import uuid
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base, JSONB, UUID


class IngestionBatch(Base):
    """One upload-to-confirm lifecycle. Separate from File because a
    re-mapped retry of the same physical file is a new batch, not a new
    file — the same File can have more than one IngestionBatch over time.
    """

    __tablename__ = 'ingestion_batches'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False, index=True)

    # sales | expense | customer | inventory | balance_sheet | profit_and_loss
    # | bank_statement | unknown
    document_type = Column(String(32), nullable=False, default='unknown')
    detection_confidence = Column(Numeric(5, 2), nullable=False, default=0)
    sheet_name = Column(String(128), nullable=True)

    # detected -> mapping_suggested -> awaiting_confirmation -> confirmed
    # -> committed | failed | rejected
    status = Column(String(32), nullable=False, default='detected', index=True)
    error_message = Column(Text, nullable=True)

    confirmed_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    committed_at = Column(DateTime(timezone=True), nullable=True)

    # The measured business impact of this import (KPI deltas, health change,
    # new alerts/actions/opportunities), captured at confirm time so the
    # Import Impact Report can be shown immediately and re-viewed from history.
    impact_report = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='ingestion_batches')
    file = relationship('File', back_populates='ingestion_batches')
    confirmed_by = relationship('User', foreign_keys=[confirmed_by_id])
    staging_rows = relationship('StagingRow', back_populates='batch', cascade='all, delete-orphan')


class ColumnMappingTemplate(Base):
    """A confirmed column mapping, remembered per company per document
    layout so the next upload in the same format skips straight to a
    one-click confirm instead of a full re-map.
    """

    __tablename__ = 'column_mapping_templates'
    __table_args__ = (
        UniqueConstraint('company_id', 'source_signature_hash', name='uq_mapping_template_company_signature'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    document_type = Column(String(32), nullable=False)

    # SHA-256 of the sorted, normalized header list -- fingerprints "this
    # layout", not "this exact file", so re-exports of the same template
    # are recognized even with different data inside.
    source_signature_hash = Column(String(64), nullable=False, index=True)

    mapping = Column(JSONB, nullable=False)  # {"Invoice Date": "invoice_date", ...}
    sample_source_headers = Column(JSONB, nullable=True)
    confidence = Column(Numeric(5, 2), nullable=False, default=0)
    times_used = Column(Integer, nullable=False, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship('Company', back_populates='column_mapping_templates')
    created_by = relationship('User', foreign_keys=[created_by_id])


class StagingRow(Base):
    """Transient pre-confirmation buffer. Nothing here has touched a
    canonical table yet. Purged on a retention schedule once its batch is
    committed or rejected -- this is a working buffer, not history.
    """

    __tablename__ = 'staging_rows'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey('ingestion_batches.id', ondelete='CASCADE'), nullable=False, index=True)
    row_index = Column(Integer, nullable=False)

    raw_data = Column(JSONB, nullable=False)      # original row, source column names as keys
    mapped_data = Column(JSONB, nullable=True)    # row after mapping, canonical field names as keys

    # valid | warning | error
    validation_status = Column(String(16), nullable=False, default='valid')
    validation_messages = Column(JSONB, nullable=True)  # [{"field": ..., "message": ...}]

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    batch = relationship('IngestionBatch', back_populates='staging_rows')
