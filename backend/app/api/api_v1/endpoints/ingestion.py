import hashlib
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File as UploadFileParam, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db, require_role
from app.core.config import settings
from app.core.logging import logger
from app.db.models.file import File
from app.db.models.ingestion import ColumnMappingTemplate, IngestionBatch
from app.db.models.user import User
from app.schemas.ingestion import (
    AnalyzeResponse,
    BatchStatusResponse,
    ConfirmRequest,
    IngestionCommitResult,
    MappingTemplateResponse,
    MappingUpdateRequest,
    MappingUpdateResponse,
    PreviewRow,
)
from app.services.ingestion.mapping_memory_service import MappingMemoryService
from app.services.ingestion.orchestrator_service import IngestionOrchestratorService
from app.services.ingestion.parsers import ParseError

router = APIRouter()


@router.delete('/imports/{batch_id}', status_code=status.HTTP_200_OK)
def delete_import(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('owner')),
):
    """Delete an import and every record it created, then recalculate the
    whole Command Center. No orphaned data remains. Owner-only — deleting
    imported data is destructive and recalculates everything."""
    from app.services.ingestion.import_management_service import ImportManagementService
    result = ImportManagementService(db).delete_import(current_user.company_id, batch_id)
    if not result.get('deleted'):
        raise HTTPException(status_code=404, detail="Import not found.")
    return result


@router.post('/recalculate', status_code=status.HTTP_200_OK)
def recalculate(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('manager')),
):
    """Force a full refresh of KPIs, health score, alerts and recommendations
    from current data."""
    from app.services.ingestion.import_management_service import ImportManagementService
    return ImportManagementService(db).recalculate(current_user.company_id)


@router.get('/field-registry')
def field_registry(current_user: User = Depends(get_current_active_user)):
    """The master list of business fields a column can map to, grouped by
    category. Powers the mapping assistant's 'search all fields' and manual
    override. Built from the canonical dictionary so it can never drift from
    what the matcher actually understands."""
    from app.services.ingestion import canonical_field_dictionary as cfd

    def pack(specs):
        return [{"field": s.name, "label": _humanize(s.name), "description": s.description,
                 "required": s.required, "synonyms": s.synonyms} for s in specs]

    groups = {
        "Sales": pack(cfd.SALES_FIELDS),
        "Expenses": pack(cfd.EXPENSE_FIELDS),
        "Customers": pack(cfd.CUSTOMER_FIELDS),
        "Inventory": pack(cfd.INVENTORY_FIELDS),
        "Bank / statement": pack(cfd.BANK_TRANSACTION_FIELDS) + pack(cfd.STATEMENT_LINE_FIELDS),
    }
    return {"groups": groups}


def _humanize(name: str) -> str:
    return name.replace('_', ' ').strip().title()


@router.get('/history')
def import_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Recent imports for this company: what was imported, when, type, and
    status — so owners can see and trust their import history."""
    rows = (
        db.query(IngestionBatch)
        .filter(IngestionBatch.company_id == current_user.company_id)
        .order_by(IngestionBatch.created_at.desc())
        .limit(25)
        .all()
    )
    return {'imports': [{
        'id': str(b.id),
        'document_type': b.document_type,
        'sheet_name': b.sheet_name,
        'status': b.status,
        'confidence': float(b.detection_confidence or 0),
        'created_at': b.created_at.isoformat() if b.created_at else None,
        'committed_at': b.committed_at.isoformat() if b.committed_at else None,
        'impact_report': b.impact_report,
        'force_imported': bool((b.impact_report or {}).get('force_imported')) if b.impact_report else False,
    } for b in rows]}

# Superset of upload.py's allowed extensions -- .xml is needed for
# Tally ERP9/TallyPrime XML exports. upload.py itself is intentionally
# left untouched with its own narrower set.
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.xml', '.pdf', '.png', '.jpg', '.jpeg'}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _validate_extension(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. You can upload CSV, Excel (XLSX/XLS), "
                   "Tally XML, PDF (bank statements/invoices), or a photo (PNG/JPG).",
        )
    return extension


def _get_company_batch(db: Session, batch_id, company_id) -> IngestionBatch:
    batch = (
        db.query(IngestionBatch)
        .filter(IngestionBatch.id == batch_id, IngestionBatch.company_id == company_id)
        .one_or_none()
    )
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingestion batch not found.")
    return batch


@router.post('/analyze', response_model=AnalyzeResponse, status_code=status.HTTP_201_CREATED)
async def analyze_file(
    file: UploadFile = UploadFileParam(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('manager')),
):
    extension = _validate_extension(file.filename)
    stored_filename = f"{uuid4()}{extension}"
    target_path = UPLOAD_DIR / stored_filename

    total_size = 0
    hasher = hashlib.sha256()

    try:
        with target_path.open('wb') as buffer:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File size exceeds the 10 MB upload limit.",
                    )
                hasher.update(chunk)
                buffer.write(chunk)
    except HTTPException:
        target_path.unlink(missing_ok=True)
        raise
    except Exception:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Unable to save the uploaded file.")

    file_hash = hasher.hexdigest()

    duplicate_warning = None
    duplicate_file = (
        db.query(File)
        .filter(File.company_id == current_user.company_id, File.file_hash == file_hash)
        .first()
    )
    if duplicate_file is not None:
        duplicate_warning = (
            "This exact file was already uploaded before. Already-imported records will be "
            "skipped automatically, and any updated figures (inventory, statements) will be refreshed."
        )

    file_record = File(
        id=uuid4(),
        company_id=current_user.company_id,
        uploaded_by_id=current_user.id,
        file_hash=file_hash,
        original_filename=file.filename,
        stored_filename=stored_filename,
        content_type=file.content_type or 'application/octet-stream',
        size=total_size,
        path=str(target_path),
        status='analyzing',
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    orchestrator = IngestionOrchestratorService(db)

    try:
        response = orchestrator.analyze(
            file_path=target_path,
            filename=file.filename,
            company_id=current_user.company_id,
            file_id=file_record.id,
        )
    except ParseError as exc:
        file_record.status = 'failed'
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Ingestion analyze failed: %s", exc)
        file_record.status = 'failed'
        db.commit()
        raise HTTPException(status_code=500, detail="Could not analyze this file.")

    file_record.status = 'staged'
    db.commit()

    response.duplicate_file_warning = duplicate_warning
    return response


@router.patch('/batches/{batch_id}/mapping', response_model=MappingUpdateResponse)
async def update_mapping(
    batch_id,
    payload: MappingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    batch = _get_company_batch(db, batch_id, current_user.company_id)
    orchestrator = IngestionOrchestratorService(db)

    preview, missing = orchestrator.update_mapping(batch, payload.mapping)
    quality = orchestrator._quality(batch, missing)

    return MappingUpdateResponse(
        batch_id=batch.id,
        status=batch.status,
        preview_rows=[
            PreviewRow(
                row_index=row.row_index,
                raw_data=row.raw_data,
                mapped_data=row.mapped_data or {},
                validation_status=row.validation_status,
                validation_messages=[m.get('message', str(m)) if isinstance(m, dict) else str(m) for m in (row.validation_messages or [])],
            )
            for row in preview
        ],
        required_fields_missing=missing,
        data_quality=quality,
    )


@router.post('/batches/{batch_id}/confirm', response_model=IngestionCommitResult)
async def confirm_batch(
    batch_id,
    payload: ConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('manager')),
):
    batch = _get_company_batch(db, batch_id, current_user.company_id)

    if batch.status == 'committed':
        # Idempotent: re-confirming an already-committed batch is a
        # no-op, not an error.
        return IngestionCommitResult(message="This batch was already imported.")

    # A previous recoverable failure may have left the batch marked 'failed'.
    # Force Import is the recovery path: clear the failed marker so the
    # orchestrator can re-run against the same staged rows with force=true.
    if batch.status == 'failed' and payload.force:
        batch.status = 'ready'
        batch.error_message = None
        db.commit()

    orchestrator = IngestionOrchestratorService(db)

    # Fatal errors block any import (force included): unreadable/corrupt file,
    # unsupported format, missing required columns, auth/DB failures. Everything
    # else is recoverable — the frontend may retry with force=true. We signal
    # this with a structured 422 carrying recoverable=True + the batch_id so the
    # Force Import recovery path never loses session state.
    _FATAL_MARKERS = (
        'unsupported', 'corrupt', 'cannot be parsed', 'cannot parse',
        'password', 'unreadable', 'empty file', 'no rows', 'missing required',
        'authentication', 'database connection', 'could not connect',
    )

    def _is_fatal(message: str) -> bool:
        m = (message or '').lower()
        return any(marker in m for marker in _FATAL_MARKERS)

    try:
        result = orchestrator.confirm(
            batch,
            current_user,
            final_mapping=payload.mapping,
            save_mapping=payload.save_mapping,
            statement_date=payload.statement_date,
            bank_name=payload.bank_name,
            bank_account_last4=payload.bank_account_last4,
            force=payload.force,
            force_reason=payload.force_reason,
        )
    except ParseError as exc:
        # Parsing failure is fatal — force cannot recover an unreadable file.
        db.rollback()
        logger.error("Ingestion confirm parse error: %s", exc)
        batch.status = 'failed'
        batch.error_message = str(exc)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'message': str(exc), 'recoverable': False, 'batch_id': str(batch.id)},
        )
    except Exception as exc:
        db.rollback()
        message = str(exc)
        fatal = _is_fatal(message)
        logger.error("Ingestion confirm failed (force=%s, fatal=%s): %s", payload.force, fatal, message)
        # Keep the batch in a re-confirmable state on recoverable errors so the
        # Force Import retry can reuse the same staged batch. Only mark 'failed'
        # when fatal or when even a forced attempt has already failed.
        if fatal or payload.force:
            batch.status = 'failed'
            batch.error_message = message
        else:
            batch.status = 'ready'  # still confirmable; awaiting a force retry
            batch.error_message = message
        db.commit()
        if fatal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={'message': 'This file cannot be imported (fatal error).', 'recoverable': False, 'batch_id': str(batch.id)},
            )
        # Recoverable: tell the frontend it may retry with force.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                'message': message or 'Import could not complete normally.',
                'recoverable': True,
                'batch_id': str(batch.id),
                'force_available': True,
            },
        )

    return result


@router.get('/batches/{batch_id}', response_model=BatchStatusResponse)
async def get_batch(
    batch_id,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    batch = _get_company_batch(db, batch_id, current_user.company_id)
    return BatchStatusResponse.model_validate(batch)


@router.get('/mapping-templates', response_model=list[MappingTemplateResponse])
async def list_mapping_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    templates = MappingMemoryService(db).list_templates(current_user.company_id)
    return [
        MappingTemplateResponse(
            id=t.id,
            document_type=t.document_type,
            sample_source_headers=t.sample_source_headers,
            confidence=float(t.confidence),
            times_used=t.times_used,
            last_used_at=t.last_used_at,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.delete('/mapping-templates/{template_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping_template(
    template_id,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    deleted = MappingMemoryService(db).delete_template(current_user.company_id, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping template not found.")


# ---------------------------------------------------------------------------
# Data Dictionary additions from the Mapping Review step.
# Create New Field and Add Synonym persist here so future imports can use them.
# ---------------------------------------------------------------------------
def _norm(text: str) -> str:
    return ' '.join((text or '').strip().lower().split())


@router.get('/data-dictionary')
def list_data_dictionary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.db.models.data_dictionary import DataDictionaryEntry
    rows = (
        db.query(DataDictionaryEntry)
        .filter(DataDictionaryEntry.company_id == current_user.company_id)
        .order_by(DataDictionaryEntry.created_at.desc())
        .all()
    )
    return {
        'fields': [
            {'field_name': r.field_name, 'category': r.category, 'description': r.description,
             'document_type': r.document_type}
            for r in rows if r.kind == 'field'
        ],
        'synonyms': [
            {'synonym': r.key, 'maps_to': r.maps_to, 'document_type': r.document_type}
            for r in rows if r.kind == 'synonym'
        ],
    }


@router.post('/data-dictionary/field', status_code=status.HTTP_201_CREATED)
def create_dictionary_field(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('manager')),
):
    from app.db.models.data_dictionary import DataDictionaryEntry
    field_name = (payload.get('field_name') or '').strip()
    if not field_name:
        raise HTTPException(status_code=400, detail='field_name is required.')
    key = _norm(field_name).replace(' ', '_')
    existing = (
        db.query(DataDictionaryEntry)
        .filter(DataDictionaryEntry.company_id == current_user.company_id,
                DataDictionaryEntry.kind == 'field', DataDictionaryEntry.key == key)
        .one_or_none()
    )
    if existing:
        return {'created': False, 'field_name': existing.field_name, 'message': 'Field already exists.'}
    entry = DataDictionaryEntry(
        company_id=current_user.company_id, kind='field', key=key,
        field_name=field_name, category=payload.get('category'),
        description=payload.get('description'), document_type=payload.get('document_type'),
        created_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    return {'created': True, 'field_name': field_name, 'category': payload.get('category')}


@router.post('/data-dictionary/synonym', status_code=status.HTTP_201_CREATED)
def add_dictionary_synonym(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('manager')),
):
    from app.db.models.data_dictionary import DataDictionaryEntry
    synonym = (payload.get('synonym') or '').strip()
    maps_to = (payload.get('maps_to') or '').strip()
    if not synonym or not maps_to:
        raise HTTPException(status_code=400, detail='synonym and maps_to are required.')
    key = _norm(synonym)
    existing = (
        db.query(DataDictionaryEntry)
        .filter(DataDictionaryEntry.company_id == current_user.company_id,
                DataDictionaryEntry.kind == 'synonym', DataDictionaryEntry.key == key)
        .one_or_none()
    )
    if existing:
        existing.maps_to = maps_to
        existing.document_type = payload.get('document_type')
        db.commit()
        return {'created': False, 'updated': True, 'synonym': synonym, 'maps_to': maps_to}
    entry = DataDictionaryEntry(
        company_id=current_user.company_id, kind='synonym', key=key,
        maps_to=maps_to, field_name=maps_to, document_type=payload.get('document_type'),
        created_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    return {'created': True, 'synonym': synonym, 'maps_to': maps_to}
