"""Working Capital Intelligence — cash conversion cycle and liquidity from real
data (sales, inventory, expenses). CCC = DSO + DIO - DPO.

DSO  = (receivables / revenue) * period_days
DIO  = (inventory value / COGS-or-expenses) * period_days
DPO  = (payables-proxy / expenses) * period_days   (payables not tracked → 0)
"""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.db.models.inventory import InventoryItem
from app.services.intelligence.trust import trust_block, explain, health_band, inr


def _f(v):
    return float(v) if v is not None else 0.0


class WorkingCapitalService:
    def __init__(self, session: Session):
        self.session = session

    def analyze(self, company_id) -> dict:
        today = date.today()
        since = today - timedelta(days=90)
        days = 90

        revenue = _f(self.session.query(func.coalesce(func.sum(Sale.amount), 0))
                     .filter(Sale.company_id == company_id, Sale.invoice_date >= since).scalar())
        expenses = _f(self.session.query(func.coalesce(func.sum(Expense.amount), 0))
                      .filter(Expense.company_id == company_id, Expense.incurred_date >= since).scalar())
        recv = self.session.query(
            func.coalesce(func.sum(Sale.amount), 0), func.coalesce(func.sum(Sale.amount_paid), 0)
        ).filter(Sale.company_id == company_id, Sale.payment_status.in_(['unpaid', 'partial', 'overdue'])).first()
        receivables = max(0.0, _f(recv[0]) - _f(recv[1])) if recv else 0.0
        inventory_value = _f(self.session.query(
            func.coalesce(func.sum(InventoryItem.quantity * InventoryItem.unit_cost), 0)
        ).filter(InventoryItem.company_id == company_id).scalar())

        if revenue <= 0 and expenses <= 0 and inventory_value <= 0:
            return {"available": False, "reason": "Import sales, expenses and inventory to unlock working-capital analysis.",
                    **self._meta(0, 0)}

        dso = round((receivables / revenue) * days, 1) if revenue > 0 else None
        dio = round((inventory_value / expenses) * days, 1) if expenses > 0 else None
        dpo = 0.0  # payables not tracked
        ccc = round((dso or 0) + (dio or 0) - dpo, 1)
        working_capital = round(receivables + inventory_value, 2)

        # Liquidity score: shorter CCC + positive WC = healthier.
        score = 60
        if dso is not None:
            score += 15 if dso <= 30 else 8 if dso <= 45 else 0
        if dio is not None:
            score += 15 if dio <= 30 else 8 if dio <= 60 else 0
        if ccc <= 30:
            score += 10
        elif ccc <= 60:
            score += 5
        score = max(0, min(100, score))

        recv_trapped = receivables
        inv_trapped = inventory_value
        top_risk = None
        if ccc > 60:
            top_risk = f"Cash conversion cycle is {ccc} days — cash is tied up too long."
        elif dso and dso > 45:
            top_risk = f"DSO is {dso} days; {inr(receivables)} is locked in receivables."
        top_opp = None
        if recv_trapped > 0:
            top_opp = f"Releasing {inr(recv_trapped)} from receivables would shorten the cash cycle."

        kpis = [
            {"label": "Working capital", "value": inr(working_capital),
             "explain": explain("Working Capital", "current assets (receivables + inventory) − current liabilities", ["Sales", "Inventory"], confidence=70)},
            {"label": "Cash conversion cycle", "value": f"{ccc} days",
             "explain": explain("Cash Conversion Cycle", "DSO + DIO − DPO", ["Sales", "Inventory", "Expenses"], confidence=65)},
            {"label": "DSO", "value": f"{dso} days" if dso is not None else "—",
             "explain": explain("Days Sales Outstanding", "(receivables / revenue) × 90", ["Sales"], confidence=70)},
            {"label": "DIO", "value": f"{dio} days" if dio is not None else "—",
             "explain": explain("Days Inventory Outstanding", "(inventory value / expenses) × 90", ["Inventory", "Expenses"], confidence=60)},
        ]
        actions = []
        if dso and dso > 45:
            actions.append({"priority": "high", "label": "Tighten collections to cut DSO"})
        if dio and dio > 60:
            actions.append({"priority": "medium", "label": "Reduce slow-moving inventory to cut DIO"})
        actions.append({"priority": "medium", "label": "Negotiate longer supplier terms to raise DPO"})

        return {
            "available": True,
            "name": "Working Capital Intelligence",
            "health_score": score,
            "health_band": health_band(score),
            "top_risk": top_risk,
            "top_opportunity": top_opp,
            "kpis": kpis,
            "insights": [
                f"{inr(recv_trapped)} cash trapped in receivables." if recv_trapped else None,
                f"{inr(inv_trapped)} cash trapped in inventory." if inv_trapped else None,
            ],
            "actions": actions,
            "executive_summary": {
                "what_happened": f"Cash conversion cycle is {ccc} days.",
                "why": "Driven by how fast you collect (DSO) and how long inventory sits (DIO).",
                "what_next": "Shorten DSO and DIO, lengthen DPO to free up cash.",
            },
            "trust": self._meta(score, 1)["trust"],
        }

    def _meta(self, score, n):
        return {"trust": trust_block(
            ["Sales", "Inventory", "Expenses"], records=n, confidence=68,
            what="Measures how efficiently cash moves through receivables, inventory and payables.",
            how="CCC = DSO + DIO − DPO; working capital = current assets − current liabilities.",
            impact_level="HIGH", impact_areas=["Liquidity", "Cash flow", "Growth funding"])}
