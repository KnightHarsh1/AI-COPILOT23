from pydantic import BaseModel


class MonthlyReportResponse(BaseModel):
    report: str