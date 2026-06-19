import hashlib
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File as UploadFileParam, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import get_current_active_user, get_db
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

# Superset of upload.py's allowed extensions -- .xml is needed for
# Tally ERP9/TallyPrime XML exports. upload.py itself is intentionally
# left untouched with its own narrower set.
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xml'}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _validate_extension(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. CSV, XLSX, and XML (Tally export) files are allowed.",
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
    current_user: User = Depends(get_current_active_user),
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
    )


@router.post('/batches/{batch_id}/confirm', response_model=IngestionCommitResult)
async def confirm_batch(
    batch_id,
    payload: ConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    batch = _get_company_batch(db, batch_id, current_user.company_id)

    if batch.status == 'committed':
        # Idempotent: re-confirming an already-committed batch is a
        # no-op, not an error.
        return IngestionCommitResult(message="This batch was already imported.")

    orchestrator = IngestionOrchestratorService(db)

    try:
        result = orchestrator.confirm(
            batch,
            current_user,
            final_mapping=payload.mapping,
            save_mapping=payload.save_mapping,
            statement_date=payload.statement_date,
            bank_name=payload.bank_name,
            bank_account_last4=payload.bank_account_last4,
        )
    except Exception as exc:
        db.rollback()
        logger.error("Ingestion confirm failed: %s", exc)
        batch.status = 'failed'
        batch.error_message = str(exc)
        db.commit()
        raise HTTPException(status_code=500, detail="Could not commit this import.")

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
