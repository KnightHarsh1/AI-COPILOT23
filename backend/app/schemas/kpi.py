from datetime import date
from typing import Optional

from pydantic import BaseModel


class KPIRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class KPIResponse(BaseModel):
    revenue: float
    gross_profit: float
    net_profit: float
    total_expenses: float
    profit_margin: float
    growth_rate: float
    customer_value: float
    inventory_turnover: float
    period_start: date
    period_end: date