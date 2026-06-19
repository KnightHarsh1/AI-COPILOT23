from typing import Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.models.ingestion import IngestionBatch, StagingRow
from app.services.ingestion.canonical_field_dictionary import required_fields_for
from app.services.ingestion.parsers import RawTable
from app.services.ingestion.validation_service import ValidationService


def apply_mapping(headers: List[str], row: list, mapping: Dict[str, Optional[str]]) -> dict:
    """Turns a raw row (positional, matching `headers`) into a dict keyed
    by canonical field name, using the source-column -> canonical-field
    mapping. Source columns mapped to None/missing are dropped."""
    raw = dict(zip(headers, row))
    mapped = {}
    for source_column, canonical_field in mapping.items():
        if canonical_field:
            mapped[canonical_field] = raw.get(source_column)
    return mapped


class StagingService:
    def __init__(self, session: Session):
        self.session = session
        self.validator = ValidationService()

    def create_batch(
        self,
        company_id,
        file_id,
        document_type: str,
        confidence: float,
        sheet_name: Optional[str] = None,
    ) -> IngestionBatch:
        batch = IngestionBatch(
            id=uuid4(),
            company_id=company_id,
            file_id=file_id,
            document_type=document_type,
            detection_confidence=confidence,
            sheet_name=sheet_name,
            status='detected',
        )
        self.session.add(batch)
        self.session.commit()
        self.session.refresh(batch)
        return batch

    def write_rows(self, batch: IngestionBatch, table: RawTable, mapping: Dict[str, Optional[str]]) -> None:
        """Replaces any existing staging rows for this batch (idempotent
        with respect to re-analysis of the same batch) and writes fresh
        ones with the given mapping applied."""
        self.session.query(StagingRow).filter(StagingRow.batch_id == batch.id).delete()

        for idx, row in enumerate(table.rows):
            mapped_data = apply_mapping(table.headers, row, mapping)
            status, messages = self.validator.validate_row(mapped_data, batch.document_type)

            self.session.add(StagingRow(
                batch_id=batch.id,
                row_index=idx,
                raw_data=dict(zip(table.headers, [str(v) if v is not None else None for v in row])),
                mapped_data={k: (str(v) if v is not None else None) for k, v in mapped_data.items()},
                validation_status=status,
                validation_messages=messages,
            ))

        batch.status = 'mapping_suggested'
        self.session.commit()

    def update_row_mapping(self, batch: IngestionBatch, mapping: Dict[str, Optional[str]]) -> None:
        """Re-derives mapped_data + re-validates every staging row for
        this batch against an edited mapping, without re-parsing the
        source file."""
        rows = self.session.query(StagingRow).filter(StagingRow.batch_id == batch.id).all()

        for row in rows:
            mapped_data = {}
            for source_column, canonical_field in mapping.items():
                if canonical_field:
                    mapped_data[canonical_field] = row.raw_data.get(source_column)

            status, messages = self.validator.validate_row(mapped_data, batch.document_type)
            row.mapped_data = mapped_data
            row.validation_status = status
            row.validation_messages = messages

        batch.status = 'awaiting_confirmation'
        self.session.commit()

    def get_preview(self, batch: IngestionBatch, limit: int = 10) -> List[StagingRow]:
        return (
            self.session.query(StagingRow)
            .filter(StagingRow.batch_id == batch.id)
            .order_by(StagingRow.row_index)
            .limit(limit)
            .all()
        )

    def missing_required_fields(self, batch: IngestionBatch, mapping: Dict[str, Optional[str]]) -> List[str]:
        mapped_fields = {v for v in mapping.values() if v}
        required = set(required_fields_for(batch.document_type))
        return sorted(required - mapped_fields)
