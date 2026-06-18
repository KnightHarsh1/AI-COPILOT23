from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UploadResponse(BaseModel):
    original_filename: str
    stored_filename: str
    content_type: str
    size: int
    path: str
    uploaded_at: datetime
    sales_added: int = 0
    expenses_added: int = 0
    duplicates_skipped: int = 0
    message: str = "Upload completed"
    is_duplicate: bool = False

    model_config = ConfigDict(from_attributes=True)


class FileRecord(BaseModel):
    id: UUID
    company_id: UUID
    original_filename: str
    stored_filename: str
    content_type: str
    size: int
    status: str
    created_at: datetime
    uploaded_by_id: Optional[UUID] = None
    records_imported: int = 0

    model_config = ConfigDict(from_attributes=True)


class UploadAnalytics(BaseModel):
    total_files: int
    total_sales_imported: int
    total_expenses_imported: int
    last_upload_at: Optional[datetime] = None
