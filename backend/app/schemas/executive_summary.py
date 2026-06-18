from pydantic import BaseModel


class ExecutiveSummaryResponse(BaseModel):
    summary: str