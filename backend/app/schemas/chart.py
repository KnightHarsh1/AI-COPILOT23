from typing import List

from pydantic import BaseModel


class ChartPoint(BaseModel):
    label: str
    value: float


class ChartSeriesResponse(BaseModel):
    data: List[ChartPoint]
