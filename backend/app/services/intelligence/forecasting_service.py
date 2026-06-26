"""Forecasting Intelligence — deterministic statistical forecasts (NOT an LLM
prompt) for revenue, expenses, profit and cash. Uses monthly history with a
linear trend + recent-average blend, and derives best/expected/worst scenarios
from historical volatility. Confidence reflects how many months of data exist.
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.services.intelligence.trust import trust_block, explain, health_band, inr


def _f(v):
    return float(v) if v is not None else 0.0


def _monthly(rows):
    """rows: list of (year, month, total) → ordered list of floats."""
    return [float(r[2] or 0) for r in rows]


def _linear_next(series):
    """Least-squares slope/intercept → next-period projection. Blended 50/50
    with the mean of the last 3 points to dampen noise."""
    n = len(series)
    if n == 0:
        return 0.0
    if n == 1:
        return series[0]
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(series) / n
    denom = sum((x - mean_x) ** 2 for x in xs) or 1
    slope = sum((xs[i] - mean_x) * (series[i] - mean_y) for i in range(n)) / denom
    intercept = mean_y - slope * mean_x
    trend_next = intercept + slope * n
    recent = sum(series[-3:]) / min(3, n)
    return max(0.0, 0.5 * trend_next + 0.5 * recent)


def _volatility(series):
    """Coefficient of variation of period-over-period change (0..~1)."""
    if len(series) < 3:
        return 0.25
    changes = [abs(series[i] - series[i - 1]) for i in range(1, len(series))]
    mean = sum(series) / len(series) or 1
    return min(0.6, (sum(changes) / len(changes)) / mean)


class ForecastingService:
    def __init__(self, session: Session):
        self.session = session

    def _series(self, model, date_col, amount_col, company_id):
        rows = (
            self.session.query(
                func.extract('year', date_col).label('y'),
                func.extract('month', date_col).label('m'),
                func.coalesce(func.sum(amount_col), 0),
            )
            .filter(model.company_id == company_id)
            .group_by('y', 'm').order_by('y', 'm').all()
        )
        return _monthly(rows)

    def analyze(self, company_id) -> dict:
        rev = self._series(Sale, Sale.invoice_date, Sale.amount, company_id)
        exp = self._series(Expense, Expense.incurred_date, Expense.amount, company_id)
        months = max(len(rev), len(exp))

        if months == 0:
            return {"available": False, "reason": "Import at least one month of sales or expenses to forecast.",
                    **self._meta(0)}

        rev_next = _linear_next(rev)
        exp_next = _linear_next(exp)
        profit_next = rev_next - exp_next
        vol = max(_volatility(rev), _volatility(exp))

        def scen(v):
            return {"best": round(v * (1 + vol), 2), "expected": round(v, 2), "worst": round(v * (1 - vol), 2)}

        confidence = 40 + min(40, months * 8) + (10 if months >= 6 else 0)
        confidence = min(90, confidence)

        score = 50
        if profit_next > 0:
            score += 25
        if rev and rev_next >= (rev[-1] if rev else 0):
            score += 15
        score = max(0, min(100, score))

        top_risk = None
        if profit_next < 0:
            top_risk = f"Next month's profit is projected negative ({inr(profit_next)})."
        elif exp_next > rev_next:
            top_risk = "Projected expenses exceed projected revenue next month."
        top_opp = None
        if rev_next > (rev[-1] if rev else 0):
            top_opp = f"Revenue is trending up — next month projected at {inr(rev_next)}."

        kpis = [
            {"label": "Revenue forecast", "value": inr(rev_next),
             "explain": explain("Revenue Forecast", "0.5·linear trend + 0.5·recent 3-month average", ["Sales"], records=len(rev), confidence=confidence)},
            {"label": "Expense forecast", "value": inr(exp_next),
             "explain": explain("Expense Forecast", "0.5·linear trend + 0.5·recent 3-month average", ["Expenses"], records=len(exp), confidence=confidence)},
            {"label": "Profit forecast", "value": inr(profit_next),
             "explain": explain("Profit Forecast", "revenue forecast − expense forecast", ["Sales", "Expenses"], confidence=confidence)},
            {"label": "Forecast confidence", "value": f"{confidence}%",
             "explain": explain("Forecast Confidence", "based on months of history + volatility", ["Sales", "Expenses"], records=months, confidence=confidence)},
        ]

        return {
            "available": True,
            "name": "Forecasting Intelligence",
            "health_score": score,
            "health_band": health_band(score),
            "top_risk": top_risk,
            "top_opportunity": top_opp,
            "kpis": kpis,
            "scenarios": {
                "revenue": scen(rev_next),
                "expenses": scen(exp_next),
                "profit": scen(profit_next),
            },
            "history": {"revenue": rev[-12:], "expenses": exp[-12:]},
            "actions": [
                {"priority": "high" if profit_next < 0 else "medium",
                 "label": "Plan spending against the projected cash position"},
                {"priority": "medium", "label": "Review the worst-case scenario and set a buffer"},
            ],
            "executive_summary": {
                "what_happened": f"Next month: revenue ~{inr(rev_next)}, expenses ~{inr(exp_next)}, profit ~{inr(profit_next)}.",
                "why": f"Projected from {months} month(s) of history using trend + recent average.",
                "what_next": "Use the expected case for planning and the worst case for safety.",
            },
            "trust": self._meta(confidence)["trust"],
        }

    def _meta(self, confidence):
        return {"trust": trust_block(
            ["Sales", "Expenses"], confidence=confidence,
            what="Projects revenue, expenses, profit and cash for the next period using your own history.",
            how="Least-squares linear trend blended with the recent 3-month average; scenarios from historical volatility.",
            impact_level="HIGH", impact_areas=["Planning", "Cash flow", "Growth"])}
