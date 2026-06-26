"""GST Reconciliation engine.

Reconciles outward tax (GSTR-1, from sales) against inward tax credit
(purchase register / GSTR-2B, from purchase_records) to produce the real net
GST position and surface mismatches. Only computes reconciliation when actual
purchase data exists — otherwise reports that GSTR-2B/purchase upload is needed
(never fabricates ITC as a final reconciliation).
"""
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.sale import Sale
from app.db.models.purchase_record import PurchaseRecord
from app.services.intelligence.trust import trust_block, explain, inr


def _f(v):
    return float(v) if v is not None else 0.0


class GSTReconciliationService:
    def __init__(self, session: Session):
        self.session = session

    def _outward_by_period(self, company_id):
        """Output tax per period from sales (GSTR-1 proxy)."""
        rows = (
            self.session.query(
                func.strftime('%Y-%m', Sale.invoice_date) if False else func.extract('year', Sale.invoice_date),
                func.extract('month', Sale.invoice_date),
                func.coalesce(func.sum(Sale.cgst), 0),
                func.coalesce(func.sum(Sale.sgst), 0),
                func.coalesce(func.sum(Sale.igst), 0),
                func.coalesce(func.sum(Sale.total_tax), 0),
            )
            .filter(Sale.company_id == company_id)
            .group_by(func.extract('year', Sale.invoice_date), func.extract('month', Sale.invoice_date))
            .all()
        )
        out = {}
        for y, m, c, s, i, t in rows:
            if y is None or m is None:
                continue
            period = f"{int(y)}-{int(m):02d}"
            tax = _f(t) or (_f(c) + _f(s) + _f(i))
            out[period] = out.get(period, 0.0) + tax
        return out

    def _inward_by_period(self, company_id):
        rows = (
            self.session.query(PurchaseRecord)
            .filter(PurchaseRecord.company_id == company_id)
            .all()
        )
        out = defaultdict(float)
        for r in rows:
            if r.period_label:
                period = r.period_label
            elif r.invoice_date:
                period = f"{r.invoice_date.year}-{r.invoice_date.month:02d}"
            else:
                period = "unknown"
            tax = _f(r.total_tax) or (_f(r.cgst) + _f(r.sgst) + _f(r.igst))
            out[period] += tax
        return dict(out)

    def analyze(self, company_id) -> dict:
        purchase_count = (
            self.session.query(func.count(PurchaseRecord.id))
            .filter(PurchaseRecord.company_id == company_id)
            .scalar()
        ) or 0

        outward = self._outward_by_period(company_id)
        total_output = round(sum(outward.values()), 2)

        if purchase_count == 0:
            return {
                "available": False,
                "reason": "Upload a purchase register or GSTR-2B file to reconcile GSTR-1 vs ITC. Output tax is shown, but ITC and net liability need purchase data.",
                "output_tax": total_output,
                "trust": trust_block(["GST R1 / Sales"], confidence=40,
                                     what="Reconciles outward GST (GSTR-1) against input tax credit (GSTR-2B/purchases).",
                                     how="Compares output tax from sales with inward tax from purchase records, per period.",
                                     impact_level="HIGH", impact_areas=["Tax liability", "ITC", "Penalty risk"]),
            }

        inward = self._inward_by_period(company_id)
        total_itc = round(sum(inward.values()), 2)
        net_liability = round(total_output - total_itc, 2)

        periods = sorted(set(list(outward.keys()) + list(inward.keys())))
        rows = []
        for p in periods:
            o = round(outward.get(p, 0.0), 2)
            i = round(inward.get(p, 0.0), 2)
            diff = round(o - i, 2)
            rows.append({
                "period": p,
                "output_tax": o,
                "input_tax_credit": i,
                "net": diff,
                "status": "matched" if abs(diff) < 1 else ("payable" if diff > 0 else "credit"),
            })

        mismatches = [r for r in rows if r["status"] != "matched"]
        itc_utilization = round(min(100.0, total_itc / total_output * 100), 1) if total_output > 0 else None

        return {
            "available": True,
            "name": "GST Reconciliation",
            "summary": {
                "output_tax": total_output,
                "input_tax_credit": total_itc,
                "net_liability": net_liability,
                "itc_utilization_pct": itc_utilization,
                "periods_reconciled": len(periods),
                "mismatch_count": len(mismatches),
            },
            "kpis": [
                {"label": "Output GST", "value": inr(total_output),
                 "explain": explain("Output GST", "Σ tax on outward supplies (GSTR-1)", ["Sales"], confidence=80)},
                {"label": "Input tax credit", "value": inr(total_itc),
                 "explain": explain("Input Tax Credit", "Σ tax on inward supplies (GSTR-2B/purchases)", ["Purchases"], confidence=80)},
                {"label": "Net liability", "value": inr(net_liability),
                 "explain": explain("Net GST Liability", "output GST − input tax credit", ["Sales", "Purchases"], confidence=78)},
                {"label": "ITC utilization", "value": itc_utilization != None and f"{itc_utilization}%" or "—",
                 "explain": explain("ITC Utilization", "ITC / output GST × 100", ["Sales", "Purchases"], confidence=75)},
            ],
            "rows": rows,
            "mismatches": mismatches,
            "top_risk": (f"{len(mismatches)} period(s) show GSTR-1 vs ITC mismatch." if mismatches else None),
            "top_opportunity": (f"{inr(total_itc)} input tax credit available to offset output GST." if total_itc > 0 else None),
            "trust": trust_block(["Sales (GSTR-1)", "Purchases (GSTR-2B)"], records=purchase_count, confidence=78,
                                 what="Reconciles outward GST (GSTR-1) against input tax credit (GSTR-2B/purchases) to show real net payable.",
                                 how="Output tax per period from sales vs inward tax per period from purchase records; differences flagged.",
                                 impact_level="HIGH", impact_areas=["Tax liability", "ITC", "Penalty risk"]),
        }
