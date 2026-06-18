from pydantic import BaseModel


class RiskAssessmentResponse(BaseModel):
    assessment: str