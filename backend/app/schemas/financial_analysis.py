from pydantic import BaseModel


class FinancialAnalysisResponse(BaseModel):
    analysis: str