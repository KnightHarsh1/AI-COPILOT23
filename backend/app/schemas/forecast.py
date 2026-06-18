from pydantic import BaseModel


class ForecastResponse(BaseModel):
    forecast: str