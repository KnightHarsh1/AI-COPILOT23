import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base import Base, UUID


class DataDictionaryEntry(Base):
    """Per-company Data Dictionary additions made from the Mapping Review step.

    Two kinds:
      - kind='field'   : a custom field the user created (field_name, category,
                         description). Becomes selectable in future imports.
      - kind='synonym' : a source-column phrase the user taught to map to an
                         existing canonical field (synonym -> maps_to). Future
                         uploads auto-map it.
    """
    __tablename__ = 'data_dictionary_entries'
    __table_args__ = (
        UniqueConstraint('company_id', 'kind', 'key', name='uq_dict_company_kind_key'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    kind = Column(String(16), nullable=False)  # field | synonym
    # For field: the canonical field_name. For synonym: the normalized synonym text.
    key = Column(String(128), nullable=False, index=True)
    document_type = Column(String(32), nullable=True)
    field_name = Column(String(128), nullable=True)   # field: itself; synonym: maps_to
    category = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    maps_to = Column(String(128), nullable=True)       # synonym -> canonical field
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
