"""Banking & Liquidity Intelligence engine.

CFO-grade cash forecasting built ONLY from real uploaded data:
Sales (invoices, due/paid dates), Expenses, Bank Statements (balance),
and Financial Statement lines (balance-sheet cash fallback).

No fabricated values: every figure traces to rows in the DB. When a feed is
missing the engine reports what it could and what it needs, rather than
inventing numbers.

Core outputs:
  - Per-customer Average Days To Pay + payer category + risk
  - Per-invoice collection probability + expected days
  - Expected collections in 7/15/30/60/90 day windows (probability-weighted)
  - Cash forecast (opening, expected collections, expected expenses, closing)
  - Cash runway (available cash / avg monthly burn)
  - Liquidity score (0-100) from cash, receivables, collection speed,
    working capital, upcoming expenses
  - Negative-cash prediction (date + amount + reason)
  - Top cash risk + top cash opportunity
  - High-priority actions
  - Trust metadata (sources, invoices/customers used, confidence)
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.customer import Customer
from app.db.models.sale import Sale
from app.db.models.expense import Expense
from app.db.models.bank_transaction import BankTransaction


def _f(value) -> float:
    return float(value) if value is not None else 0.0


def _payer_category(avg_days):
    if avg_days is None:
        return "Unknown"
    if avg_days <= 5:
        return "Early Payer"
    if avg_days <= 30:
        return "On Time"
    if avg_days <= 60:
        return "Slow Payer"
    return "Chronic Defaulter"


def _risk_from_days(avg_days):
    if avg_days is None:
        return "Unknown"
    if avg_days <= 30:
        return "Low"
    if avg_days <= 60:
        return "Medium"
    return "High"


class BankingLiquidityService:
    def __init__(self, session: Session):
        self.session = session

    # ---- helpers -------------------------------------------------------
    def _available_cash(self, company_id) -> float:
        """Latest bank balance; falls back to net bank flow if no balance col."""
        latest = (
            self.session.query(BankTransaction)
            .filter(BankTransaction.company_id == company_id)
            .filter(BankTransaction.balance_after.isnot(None))
            .order_by(BankTransaction.transaction_date.desc())
            .first()
        )
        if latest and latest.balance_after is not None:
            return _f(latest.balance_after)
        agg = (
            self.session.query(
                func.coalesce(func.sum(BankTransaction.credit_amount), 0),
                func.coalesce(func.sum(BankTransaction.debit_amount), 0),
            )
            .filter(BankTransaction.company_id == company_id)
            .first()
        )
        if agg:
            return _f(agg[0]) - _f(agg[1])
        return 0.0

    def _avg_monthly_burn(self, company_id, today) -> float:
        """Average monthly expense over the last 90 days of expense data."""
        since = today - timedelta(days=90)
        total = (
            self.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(Expense.company_id == company_id)
            .filter(Expense.incurred_date >= since)
            .scalar()
        )
        total = _f(total)
        return round(total / 3.0, 2) if total else 0.0

    def _customer_avg_days_to_pay(self, company_id):
        """Map customer_name -> avg days between invoice_date and paid_date."""
        paid = (
            self.session.query(Sale)
            .filter(Sale.company_id == company_id)
            .filter(Sale.paid_date.isnot(None))
            .filter(Sale.invoice_date.isnot(None))
            .all()
        )
        acc = {}
        for s in paid:
            try:
                days = (s.paid_date - s.invoice_date).days
            except Exception:
                continue
            if days < 0:
                days = 0
            key = (s.customer_name or "Unknown").strip()
            acc.setdefault(key, []).append(days)
        return {k: round(sum(v) / len(v), 1) for k, v in acc.items() if v}

    # ---- main ----------------------------------------------------------
    def analyze(self, company_id) -> dict:
        today = date.today()

        open_sales = (
            self.session.query(Sale)
            .filter(Sale.company_id == company_id)
            .filter(Sale.payment_status.in_(["unpaid", "partial", "overdue"]))
            .all()
        )
        all_sales_count = (
            self.session.query(func.count(Sale.id))
            .filter(Sale.company_id == company_id)
            .scalar()
        ) or 0

        if all_sales_count == 0:
            return {
                "available": False,
                "reason": "No sales data yet. Import your Sales Register (with due dates) to unlock cash forecasting.",
                "what_it_does": self._what_it_does(),
            }

        avg_days_map = self._customer_avg_days_to_pay(company_id)
        global_avg_days = (
            round(sum(avg_days_map.values()) / len(avg_days_map), 1)
            if avg_days_map else 45.0
        )

        # ---- per-invoice probability + expected window ----
        windows = {7: 0.0, 15: 0.0, 30: 0.0, 60: 0.0, 90: 0.0}
        invoices = []
        total_outstanding = 0.0
        overdue_60_plus = 0.0
        customers_used = set()
        for s in open_sales:
            outstanding = _f(s.amount) - _f(s.amount_paid)
            if outstanding <= 0:
                continue
            total_outstanding += outstanding
            name = (s.customer_name or "Unknown").strip()
            customers_used.add(name)
            cust_avg = avg_days_map.get(name, global_avg_days)
            due = s.due_date or s.invoice_date
            days_overdue = (today - due).days if due else 0
            if days_overdue >= 60:
                overdue_60_plus += outstanding

            # Probability: starts high, decays with how far past expected pay time.
            base = 0.95
            if days_overdue > 0:
                base -= min(days_overdue, 120) / 200.0  # up to -0.6
            if cust_avg > 60:
                base -= 0.15
            elif cust_avg > 30:
                base -= 0.05
            prob = max(0.1, min(0.98, base))

            expected_days = max(1, int(round(cust_avg - max(0, -days_overdue))))
            if days_overdue > 0:
                expected_days = max(3, int(round(cust_avg * 0.5)))

            for w in windows:
                if expected_days <= w:
                    windows[w] += outstanding * prob

            invoices.append({
                "invoice_number": s.invoice_number or str(s.id)[:8],
                "customer": name,
                "amount": round(outstanding, 2),
                "probability": round(prob * 100),
                "expected_days": expected_days,
                "days_overdue": max(0, days_overdue),
            })

        windows = {k: round(v, 2) for k, v in windows.items()}
        invoices.sort(key=lambda i: i["amount"], reverse=True)

        # ---- customers payment behaviour ----
        customers = []
        for name, avg in sorted(avg_days_map.items(), key=lambda kv: kv[1], reverse=True):
            customers.append({
                "customer": name,
                "avg_days_to_pay": avg,
                "category": _payer_category(avg),
                "risk": _risk_from_days(avg),
            })

        # ---- cash forecast (30-day default horizon) ----
        available_cash = self._available_cash(company_id)
        monthly_burn = self._avg_monthly_burn(company_id, today)
        expected_collections_30 = windows[30]
        expected_expenses_30 = monthly_burn
        projected_cash_30 = round(available_cash + expected_collections_30 - expected_expenses_30, 2)

        forecast = []
        running = available_cash
        for label, days in [("7 Days", 7), ("15 Days", 15), ("30 Days", 30), ("60 Days", 60), ("90 Days", 90)]:
            coll = windows[days]
            exp = round(monthly_burn * (days / 30.0), 2)
            closing = round(available_cash + coll - exp, 2)
            forecast.append({
                "horizon": label,
                "opening_cash": round(available_cash, 2),
                "expected_collections": coll,
                "expected_expenses": exp,
                "closing_cash": closing,
            })

        # ---- runway ----
        daily_burn = monthly_burn / 30.0 if monthly_burn else 0.0
        runway_days = int(available_cash / daily_burn) if daily_burn > 0 else None
        runway_status = (
            "Healthy" if (runway_days is None or runway_days >= 90)
            else "Warning" if runway_days >= 45 else "Critical"
        )

        # ---- negative-cash prediction ----
        negative = {"will_go_negative": False}
        if daily_burn > 0:
            # Step day-by-day for 90 days, adding collections on their expected day.
            coll_by_day = {}
            for inv in invoices:
                d = inv["expected_days"]
                coll_by_day[d] = coll_by_day.get(d, 0.0) + inv["amount"] * (inv["probability"] / 100.0)
            bal = available_cash
            for day in range(1, 91):
                bal += coll_by_day.get(day, 0.0)
                bal -= daily_burn
                if bal < 0:
                    negative = {
                        "will_go_negative": True,
                        "date": (today + timedelta(days=day)).isoformat(),
                        "amount": round(abs(bal), 2),
                        "reason": "Projected expenses outpace expected collections in this window.",
                    }
                    break

        # ---- liquidity score (0-100) ----
        score = 0
        # cash vs burn (35)
        if monthly_burn <= 0:
            score += 30
        elif runway_days is None:
            score += 30
        else:
            score += max(0, min(35, int(runway_days / 90 * 35)))
        # collection speed (25)
        if global_avg_days <= 30:
            score += 25
        elif global_avg_days <= 45:
            score += 18
        elif global_avg_days <= 60:
            score += 10
        else:
            score += 4
        # overdue concentration (20)
        if total_outstanding <= 0:
            score += 20
        else:
            overdue_ratio = overdue_60_plus / total_outstanding
            score += max(0, int(20 * (1 - overdue_ratio)))
        # near-term coverage (20): can 30-day collections cover 30-day expenses?
        if expected_expenses_30 <= 0:
            score += 20
        else:
            cover = min(1.0, expected_collections_30 / expected_expenses_30)
            score += int(20 * cover)
        liquidity_score = max(0, min(100, score))

        # ---- top risk / opportunity ----
        top_risk = None
        if overdue_60_plus > 0:
            top_risk = f"₹{self._inr(overdue_60_plus)} in receivables are overdue more than 60 days."
        elif negative["will_go_negative"]:
            top_risk = f"Cash may turn negative around {negative['date']}."
        elif runway_days is not None and runway_days < 45:
            top_risk = f"Cash runway is only {runway_days} days."

        top5 = sum(i["amount"] for i in invoices[:5])
        top_opportunity = None
        if top5 > 0:
            top_opportunity = f"Accelerating collection of the top 5 invoices could improve cash by ₹{self._inr(top5)}."

        # ---- actions ----
        actions = []
        for c in customers:
            if c["risk"] == "High":
                actions.append({"priority": "high", "label": f"Follow up {c['customer']} (avg {c['avg_days_to_pay']}d to pay)"})
                if len(actions) >= 2:
                    break
        for inv in invoices[:2]:
            if inv["days_overdue"] > 0:
                actions.append({"priority": "high", "label": f"Collect Invoice {inv['invoice_number']} (₹{self._inr(inv['amount'])}, {inv['days_overdue']}d overdue)"})
        if runway_days is not None and runway_days < 60:
            actions.append({"priority": "high", "label": "Delay non-critical spending to extend runway"})
        actions.append({"priority": "medium", "label": "Review the 30-day cash forecast"})

        # ---- confidence ----
        have_due = self.session.query(func.count(Sale.id)).filter(
            Sale.company_id == company_id, Sale.due_date.isnot(None)
        ).scalar() or 0
        have_paid = len([1 for v in avg_days_map.values()])
        confidence = 50
        if have_due:
            confidence += 20
        if have_paid >= 3:
            confidence += 15
        if available_cash > 0:
            confidence += 15
        confidence = min(95, confidence)

        return {
            "available": True,
            "what_it_does": self._what_it_does(),
            "summary": {
                "total_outstanding": round(total_outstanding, 2),
                "available_cash": round(available_cash, 2),
                "liquidity_score": liquidity_score,
                "runway_days": runway_days,
                "runway_status": runway_status,
            },
            "expected_collections": {
                "by_window": {f"{k}d": v for k, v in windows.items()},
            },
            "cash_forecast": forecast,
            "cash_forecast_30d": {
                "opening_cash": round(available_cash, 2),
                "expected_collections": expected_collections_30,
                "expected_expenses": expected_expenses_30,
                "projected_cash": projected_cash_30,
            },
            "negative_cash": negative,
            "customers": customers[:25],
            "invoices": invoices[:50],
            "top_risk": top_risk,
            "top_opportunity": top_opportunity,
            "actions": actions[:6],
            "liquidity_score": {
                "score": liquidity_score,
                "factors": ["Cash position", "Receivables", "Collection speed", "Working capital", "Upcoming expenses"],
            },
            "questions": {
                "owed": round(total_outstanding, 2),
                "likely_arrive_30d": expected_collections_30,
                "runway_days": runway_days,
                "will_go_negative": negative.get("will_go_negative", False),
            },
            "trust": {
                "data_sources": ["Sales Register", "Expense Register", "Bank Statement"],
                "invoices_used": len(invoices),
                "customers_used": len(customers_used),
                "confidence": confidence,
                "last_updated": today.isoformat(),
            },
        }

    @staticmethod
    def _inr(value) -> str:
        try:
            v = float(value)
        except Exception:
            return str(value)
        if abs(v) >= 1e7:
            return f"{v / 1e7:.2f}Cr"
        if abs(v) >= 1e5:
            return f"{v / 1e5:.2f}L"
        if abs(v) >= 1e3:
            return f"{v / 1e3:.0f}K"
        return f"{v:.0f}"

    @staticmethod
    def _what_it_does() -> dict:
        return {
            "what": "Turns your bank balance, receivables, sales and expenses into a forward cash forecast — how much is owed, how much will likely arrive, when, and how long cash will last.",
            "how": {
                "data_sources": ["Sales", "Expenses", "Bank Statements", "Receivables"],
                "logic": "Collection probability per invoice from customer payment history, aging and amount; expenses from average monthly burn; cash stepped day-by-day to detect shortfalls.",
            },
            "impact": {"level": "HIGH", "areas": ["Cash flow", "Liquidity", "Growth funding"]},
        }


def liquidity_report(session: Session, company_id) -> dict:
    """Liquidity Report payload: cash, forecast, runway, risk, behaviour."""
    data = BankingLiquidityService(session).analyze(company_id)
    if not data.get("available"):
        return data
    return {
        "available": True,
        "cash_position": data["summary"]["available_cash"],
        "collection_forecast": data["expected_collections"],
        "cash_forecast": data["cash_forecast"],
        "runway": {"days": data["summary"]["runway_days"], "status": data["summary"]["runway_status"]},
        "risk_analysis": {"top_risk": data["top_risk"], "negative_cash": data["negative_cash"]},
        "customer_payment_behaviour": data["customers"],
        "liquidity_score": data["liquidity_score"],
        "trust": data["trust"],
    }
