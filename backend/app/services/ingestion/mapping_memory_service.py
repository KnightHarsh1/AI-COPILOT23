import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models.ingestion import ColumnMappingTemplate


def compute_signature_hash(headers: List[str]) -> str:
    """Fingerprints a document *layout*, not a specific file: same sorted,
    lowercased, whitespace-normalized header set -> same hash, regardless
    of row order, row count, or which month's data is inside.
    """
    normalized = sorted(' '.join(str(h).strip().lower().split()) for h in headers)
    joined = '|'.join(normalized)
    return hashlib.sha256(joined.encode('utf-8')).hexdigest()


class MappingMemoryService:
    def __init__(self, session: Session):
        self.session = session

    def find_cached_mapping(self, company_id, signature_hash: str) -> Optional[ColumnMappingTemplate]:
        return (
            self.session.query(ColumnMappingTemplate)
            .filter(
                ColumnMappingTemplate.company_id == company_id,
                ColumnMappingTemplate.source_signature_hash == signature_hash,
            )
            .one_or_none()
        )

    def save_mapping(
        self,
        company_id,
        document_type: str,
        headers: List[str],
        mapping: Dict[str, Optional[str]],
        confidence: float,
        created_by_id=None,
    ) -> ColumnMappingTemplate:
        signature_hash = compute_signature_hash(headers)
        existing = self.find_cached_mapping(company_id, signature_hash)

        if existing is not None:
            existing.mapping = mapping
            existing.confidence = confidence
            existing.sample_source_headers = headers
            self.session.commit()
            return existing

        template = ColumnMappingTemplate(
            company_id=company_id,
            document_type=document_type,
            source_signature_hash=signature_hash,
            mapping=mapping,
            sample_source_headers=headers,
            confidence=confidence,
            created_by_id=created_by_id,
        )
        self.session.add(template)
        self.session.commit()
        self.session.refresh(template)
        return template

    def increment_usage(self, template: ColumnMappingTemplate) -> None:
        template.times_used = (template.times_used or 0) + 1
        template.last_used_at = datetime.now(timezone.utc)
        self.session.commit()

    def list_templates(self, company_id) -> List[ColumnMappingTemplate]:
        return (
            self.session.query(ColumnMappingTemplate)
            .filter(ColumnMappingTemplate.company_id == company_id)
            .order_by(ColumnMappingTemplate.last_used_at.desc().nullslast())
            .all()
        )

    def delete_template(self, company_id, template_id) -> bool:
        template = (
            self.session.query(ColumnMappingTemplate)
            .filter(
                ColumnMappingTemplate.company_id == company_id,
                ColumnMappingTemplate.id == template_id,
            )
            .one_or_none()
        )
        if template is None:
            return False
        self.session.delete(template)
        self.session.commit()
        return True
