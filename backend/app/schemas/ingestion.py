from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ColumnSuggestion(BaseModel):
    source_column: str
    sample_values: List[str] = []
    suggested_field: Optional[str] = None
    confidence: float = 0.0
    source: Literal['memory', 'heuristic', 'ai', 'unmapped'] = 'unmapped'


class PreviewRow(BaseModel):
    row_index: int
    raw_data: Dict[str, Any]
    mapped_data: Dict[str, Any] = {}
    validation_status: Literal['valid', 'warning', 'error'] = 'valid'
    validation_messages: List[str] = []


class AnalyzeResponse(BaseModel):
    batch_id: UUID
    document_type: str
    detection_confidence: float
    sheet_name: Optional[str] = None
    status: str
    suggested_mapping: List[ColumnSuggestion] = []
    preview_rows: List[PreviewRow] = []
    required_fields_missing: List[str] = []
    matched_template_id: Optional[UUID] = None
    duplicate_file_warning: Optional[str] = None
    data_quality: Optional[dict] = None
    profiling: Optional[dict] = None
    business_readiness: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class MappingUpdateRequest(BaseModel):
    # {"Invoice Date": "invoice_date", "Sale Value": "amount", ...}
    mapping: Dict[str, Optional[str]]


class MappingUpdateResponse(BaseModel):
    batch_id: UUID
    status: str
    preview_rows: List[PreviewRow] = []
    required_fields_missing: List[str] = []
    data_quality: Optional[dict] = None


class ConfirmRequest(BaseModel):
    # The final mapping in effect (including any last-second edits) --
    # re-applied once more before commit, and what gets saved to
    # mapping memory. This is the single source of truth for "what
    # mapping is this confirm using", since staging rows only store the
    # *result* of a mapping, not the mapping dict itself.
    mapping: Dict[str, Optional[str]]
    save_mapping: bool = True
    # Required context for balance_sheet/profit_and_loss batches, since a
    # statement's line items don't carry their own period -- defaults to
    # today if omitted, with a warning in the response message.
    statement_date: Optional[date] = None
    # Optional context for bank_statement batches.
    bank_name: Optional[str] = None
    bank_account_last4: Optional[str] = None
    # Force import: proceed despite low-confidence mappings, missing
    # recommended fields, duplicate detection or validation warnings. The
    # reason is stored in the audit log. Critical structural failures still
    # block; this only bypasses non-critical warnings.
    force: bool = False
    force_reason: Optional[str] = None


class IngestionCommitResult(BaseModel):
    # Deliberately the same shape as the existing UploadResponse fields
    # used today, so the frontend's existing summary-tile pattern needs
    # minimal change to consume either response.
    sales_added: int = 0
    expenses_added: int = 0
    customers_added: int = 0
    inventory_added: int = 0
    statement_lines_added: int = 0
    bank_transactions_added: int = 0
    duplicates_skipped: int = 0
    rows_skipped_invalid: int = 0
    message: str = 'Import completed'
    is_duplicate: bool = False
    impact_report: Optional[dict] = None
    force_imported: bool = False
    warnings: List[str] = []


class BatchStatusResponse(BaseModel):
    id: UUID
    company_id: UUID
    document_type: str
    detection_confidence: float
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    committed_at: Optional[datetime] = None
    result: Optional[IngestionCommitResult] = None

    model_config = ConfigDict(from_attributes=True)


class MappingTemplateResponse(BaseModel):
    id: UUID
    document_type: str
    sample_source_headers: Optional[List[str]] = None
    confidence: float
    times_used: int
    last_used_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
