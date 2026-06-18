from pydantic import BaseModel


class PDFReportResponse(BaseModel):
    filename: str
    message: str