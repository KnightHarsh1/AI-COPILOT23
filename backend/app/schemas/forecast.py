from pydantic import BaseModel


class ForecastResponse(BaseModel):
    forecast: str
    confidence: dict | None = None