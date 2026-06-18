import hashlib
from datetime import date as date_type, datetime
from pathlib import Path
from uuid import uuid4

import pandas as pd

from fastapi import APIRouter, File as UploadFileParam, HTTPException, UploadFile, status, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.schemas.upload import FileRecord, UploadAnalytics, UploadResponse
from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)
from app.db.models.user import User
from app.db.models.file import File
from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.services.alert_service import AlertService
from app.services.recommendation_service import RecommendationService

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_upload_file(filename: str) -> str:
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only CSV and XLSX files are allowed.",
        )

    return extension


def _load_dataframe(path: Path, extension: str) -> pd.DataFrame:
    if extension == ".csv":
        return pd.read_csv(path)
    return pd.read_excel(path)


def _coerce_date(value) -> date_type:
    """Accepts dd-mm-yyyy strings (CSV) or native datetime/Timestamp values (XLSX)."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date_type):
        return value
    if hasattr(value, "to_pydatetime"):  # pandas.Timestamp
        return value.to_pydatetime().date()

    text = str(value).strip()
    try:
        return datetime.strptime(text, "%d-%m-%Y").date()
    except ValueError:
        pass

    parsed = pd.to_datetime(text, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        raise ValueError(f"Unrecognized date value: {value!r}")
    return parsed.date()


@router.post(
    "/",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    file: UploadFile = UploadFileParam(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    extension = validate_upload_file(file.filename)

    stored_filename = f"{uuid4()}{extension}"
    target_path = UPLOAD_DIR / stored_filename

    total_size = 0
    hasher = hashlib.sha256()

    try:
        with target_path.open("wb") as buffer:
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the uploaded file.",
        )

    file_hash = hasher.hexdigest()

    duplicate_file = (
        db.query(File)
        .filter(File.company_id == current_user.company_id, File.file_hash == file_hash)
        .first()
    )

    if duplicate_file is not None:
        # Same bytes already imported for this company. Don't silently
        # succeed — record the attempt for the upload history, but skip
        # re-processing and free the redundant copy on disk.
        try:
            df = _load_dataframe(target_path, extension)
            row_count = len(df)
        except Exception:
            row_count = 0

        target_path.unlink(missing_ok=True)

        file_record = File(
            id=uuid4(),
            company_id=current_user.company_id,
            uploaded_by_id=current_user.id,
            file_hash=file_hash,
            original_filename=file.filename,
            stored_filename=stored_filename,
            content_type=file.content_type or "application/octet-stream",
            size=total_size,
            path=str(target_path),
            status="duplicate",
        )
        db.add(file_record)
        db.commit()

        return UploadResponse(
            original_filename=file.filename,
            stored_filename=stored_filename,
            content_type=file.content_type or "application/octet-stream",
            size=total_size,
            path=str(target_path),
            uploaded_at=file_record.created_at or datetime.utcnow(),
            sales_added=0,
            expenses_added=0,
            duplicates_skipped=row_count,
            is_duplicate=True,
            message="This file appears to have already been imported.",
        )

    file_id = uuid4()
    sales_added = 0
    expenses_added = 0
    duplicates_skipped = 0
    rows_skipped_invalid = 0

    try:
        df = _load_dataframe(target_path, extension)
        df.columns = [str(col).strip() for col in df.columns]

        if "invoice_date" in df.columns:
            required_columns = {"invoice_date", "amount", "category"}
            if not required_columns.issubset(df.columns):
                raise HTTPException(
                    status_code=400,
                    detail="Sales file must contain: invoice_date, amount, category",
                )

            for _, row in df.iterrows():
                try:
                    invoice_date = _coerce_date(row["invoice_date"])
                    amount = float(row["amount"])
                    category = str(row["category"]).strip()
                except (ValueError, TypeError):
                    rows_skipped_invalid += 1
                    continue

                existing_sale = (
                    db.query(Sale)
                    .filter(
                        Sale.company_id == current_user.company_id,
                        Sale.invoice_date == invoice_date,
                        Sale.amount == amount,
                        Sale.category == category,
                    )
                    .first()
                )

                if existing_sale:
                    duplicates_skipped += 1
                    continue

                sale = Sale(
                    company_id=current_user.company_id,
                    invoice_date=invoice_date,
                    amount=amount,
                    category=category,
                    source_file_id=file_id,
                )
                db.add(sale)
                sales_added += 1

        elif "incurred_date" in df.columns:
            required_columns = {"vendor", "amount", "category", "incurred_date"}
            if not required_columns.issubset(df.columns):
                raise HTTPException(
                    status_code=400,
                    detail="Expense file must contain: vendor, amount, category, incurred_date",
                )

            for _, row in df.iterrows():
                try:
                    incurred_date = _coerce_date(row["incurred_date"])
                    amount = float(row["amount"])
                    vendor = str(row["vendor"]).strip()
                    raw_category = row.get("category")
                    category = None if pd.isna(raw_category) else str(raw_category).strip()
                except (ValueError, TypeError):
                    rows_skipped_invalid += 1
                    continue

                existing_expense = (
                    db.query(Expense)
                    .filter(
                        Expense.company_id == current_user.company_id,
                        Expense.vendor == vendor,
                        Expense.amount == amount,
                        Expense.incurred_date == incurred_date,
                    )
                    .first()
                )

                if existing_expense:
                    duplicates_skipped += 1
                    continue

                expense = Expense(
                    company_id=current_user.company_id,
                    vendor=vendor,
                    amount=amount,
                    category=category,
                    incurred_date=incurred_date,
                    source_file_id=file_id,
                )
                db.add(expense)
                expenses_added += 1

        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unknown file format. "
                    "Sales files require an invoice_date column. "
                    "Expense files require an incurred_date column."
                ),
            )

    except HTTPException:
        db.rollback()
        target_path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        db.rollback()
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"File import failed: {str(exc)}",
        )

    file_record = File(
        id=file_id,
        company_id=current_user.company_id,
        uploaded_by_id=current_user.id,
        file_hash=file_hash,
        original_filename=file.filename,
        stored_filename=stored_filename,
        content_type=file.content_type or "application/octet-stream",
        size=total_size,
        path=str(target_path),
        status="processed",
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    message = "Upload completed."
    if rows_skipped_invalid:
        message = f"Upload completed with {rows_skipped_invalid} row(s) skipped due to invalid data."

    # Refresh alerts + recommendations immediately so the dashboard reflects
    # the new data without requiring a separate manual step.
    try:
        AlertService(db).generate_alerts(current_user.company_id)
        RecommendationService(db).generate_recommendations(
            company_id=current_user.company_id,
            generated_by_id=current_user.id,
        )
    except Exception as exc:
        logger.warning("Post-upload insight generation failed: %s", exc)

    return UploadResponse(
        original_filename=file.filename,
        stored_filename=stored_filename,
        content_type=file.content_type or "application/octet-stream",
        size=total_size,
        path=str(target_path),
        uploaded_at=file_record.created_at,
        sales_added=sales_added,
        expenses_added=expenses_added,
        duplicates_skipped=duplicates_skipped,
        is_duplicate=False,
        message=message,
    )


@router.get("/history", response_model=list[FileRecord])
def get_upload_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    files = (
        db.query(File)
        .filter(File.company_id == current_user.company_id)
        .order_by(File.created_at.desc())
        .all()
    )

    sales_counts = dict(
        db.query(Sale.source_file_id, func.count(Sale.id))
        .filter(Sale.company_id == current_user.company_id, Sale.source_file_id.isnot(None))
        .group_by(Sale.source_file_id)
        .all()
    )
    expense_counts = dict(
        db.query(Expense.source_file_id, func.count(Expense.id))
        .filter(Expense.company_id == current_user.company_id, Expense.source_file_id.isnot(None))
        .group_by(Expense.source_file_id)
        .all()
    )

    results = []
    for f in files:
        records_imported = sales_counts.get(f.id, 0) + expense_counts.get(f.id, 0)
        results.append(
            FileRecord(
                id=f.id,
                company_id=f.company_id,
                original_filename=f.original_filename,
                stored_filename=f.stored_filename,
                content_type=f.content_type,
                size=f.size,
                status=f.status,
                created_at=f.created_at,
                uploaded_by_id=f.uploaded_by_id,
                records_imported=records_imported,
            )
        )
    return results


@router.delete("/{file_id}")
def delete_uploaded_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    file_record = (
        db.query(File)
        .filter(File.id == file_id, File.company_id == current_user.company_id)
        .first()
    )

    if file_record is None:
        raise HTTPException(status_code=404, detail="File not found.")

    deleted_sales = (
        db.query(Sale)
        .filter(Sale.company_id == current_user.company_id, Sale.source_file_id == file_record.id)
        .delete(synchronize_session=False)
    )
    deleted_expenses = (
        db.query(Expense)
        .filter(Expense.company_id == current_user.company_id, Expense.source_file_id == file_record.id)
        .delete(synchronize_session=False)
    )

    try:
        Path(file_record.path).unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Could not remove physical file %s: %s", file_record.path, exc)

    db.delete(file_record)
    db.commit()

    return {
        "message": "File and associated records deleted.",
        "deleted_sales": deleted_sales,
        "deleted_expenses": deleted_expenses,
    }


@router.get("/analytics", response_model=UploadAnalytics)
def get_upload_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    total_files = (
        db.query(func.count(File.id))
        .filter(File.company_id == current_user.company_id)
        .scalar()
    ) or 0

    total_sales_imported = (
        db.query(func.count(Sale.id))
        .filter(Sale.company_id == current_user.company_id)
        .scalar()
    ) or 0

    total_expenses_imported = (
        db.query(func.count(Expense.id))
        .filter(Expense.company_id == current_user.company_id)
        .scalar()
    ) or 0

    last_upload_at = (
        db.query(func.max(File.created_at))
        .filter(File.company_id == current_user.company_id, File.status == "processed")
        .scalar()
    )

    return UploadAnalytics(
        total_files=total_files,
        total_sales_imported=total_sales_imported,
        total_expenses_imported=total_expenses_imported,
        last_upload_at=last_upload_at,
    )
