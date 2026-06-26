"""Risk Intelligence — a composite enterprise risk score aggregating the risk
signals already computed by other engines (liquidity, customer concentration,
inventory, compliance, collections). Each sub-risk is 0-100 (higher = riskier);
the overall score inverts to a 0-100 health value for consistency with other
modules.
"""
from sqlalchemy.orm import Session

from app.services.intelligence.trust import trust_block, explain, health_band


def _safe(fn, default=None):
    try:
        return fn()
    except Exception:
        return default


class RiskIntelligenceService:
    def __init__(self, session: Session):
        self.session = session

    def analyze(self, company_id) -> dict:
        s = self.session
        from app.services.intelligence.banking_liquidity_service import BankingLiquidityService
        from app.services.intelligence.customer_intelligence_service import CustomerIntelligenceService
        from app.services.intelligence.product_service import ProductIntelligenceService
        from app.services.intelligence.collections_service import CollectionsIntelligenceService
        from app.services.intelligence.compliance_service import ComplianceIntelligenceService

        liq = _safe(lambda: BankingLiquidityService(s).analyze(company_id), {})
        cust = _safe(lambda: CustomerIntelligenceService(s).analyze(company_id), {})
        prod = _safe(lambda: ProductIntelligenceService(s).analyze(company_id), {})
        coll = _safe(lambda: CollectionsIntelligenceService(s).analyze(company_id), {})
        comp = _safe(lambda: ComplianceIntelligenceService(s).analyze(company_id), {})

        risks = {}  # name -> (risk_0_100, available)
        # Liquidity risk: inverse of liquidity score.
        if liq.get("available"):
            ls = (liq.get("summary") or {}).get("liquidity_score")
            if ls is not None:
                risks["Liquidity risk"] = (100 - ls, True)
        # Customer risk: concentration (top customer share lives on collections).
        share = coll.get("top_customer_share") if coll.get("available") else None
        if share is not None:
            risks["Customer risk"] = (min(100, float(share)), True)
        # Inventory risk: from product health score if present.
        if prod.get("available"):
            ph = prod.get("product_health_score")
            if ph is not None:
                risks["Inventory risk"] = (100 - float(ph), True)
        # Collections risk: inverse of credit health score.
        if coll.get("available"):
            cscore = coll.get("credit_health_score")
            if cscore is not None:
                risks["Collections risk"] = (max(0.0, 100 - float(cscore)), True)
        # Compliance risk: upcoming/overdue deadlines.
        if comp.get("available"):
            overdue = len(comp.get("overdue") or [])
            upcoming = len(comp.get("upcoming") or [])
            risks["Compliance risk"] = (min(100, overdue * 40 + upcoming * 8), True)

        if not risks:
            return {"available": False, "reason": "Import financial data to compute enterprise risk.", **self._meta(0)}

        overall_risk = round(sum(r for r, _ in risks.values()) / len(risks), 1)
        score = max(0, min(100, round(100 - overall_risk)))

        breakdown = [{"label": k, "risk": round(v, 1),
                      "level": "high" if v >= 60 else "medium" if v >= 35 else "low"}
                     for k, (v, _) in sorted(risks.items(), key=lambda kv: kv[1][0], reverse=True)]

        top = breakdown[0] if breakdown else None
        top_risk = f"{top['label']} is elevated ({top['risk']}/100)." if top and top["risk"] >= 35 else "No major risks detected."
        top_opp = "Reducing your highest risk category would lift the overall risk profile." if top else None

        kpis = [{"label": "Overall risk score", "value": f"{overall_risk}/100",
                 "explain": explain("Overall Risk", "average of liquidity, customer, inventory, collections and compliance risk", ["Multiple engines"], records=len(risks), confidence=70)}]
        for b in breakdown:
            kpis.append({"label": b["label"], "value": f"{b['risk']}/100",
                         "explain": explain(b["label"], "domain-specific risk (0=safe,100=critical)", ["Domain engine"], confidence=65)})

        return {
            "available": True,
            "name": "Risk Intelligence",
            "health_score": score,
            "health_band": health_band(score),
            "top_risk": top_risk,
            "top_opportunity": top_opp,
            "kpis": kpis[:6],
            "risk_breakdown": breakdown,
            "actions": [{"priority": "high" if b["risk"] >= 60 else "medium",
                         "label": f"Mitigate {b['label'].lower()}"} for b in breakdown[:3]],
            "executive_summary": {
                "what_happened": f"Overall risk is {overall_risk}/100 across {len(risks)} categories.",
                "why": f"Highest contributor: {top['label']}." if top else "Balanced risk profile.",
                "what_next": "Focus mitigation on the top-ranked risk category.",
            },
            "trust": self._meta(70)["trust"],
        }

    def _meta(self, confidence):
        return {"trust": trust_block(
            ["Liquidity", "Customer", "Inventory", "Collections", "Compliance"], confidence=confidence,
            what="Aggregates every domain's risk into one enterprise risk score and ranks the biggest threats.",
            how="Each engine's risk (0-100) is averaged; the overall score inverts to a health value.",
            impact_level="HIGH", impact_areas=["Survival", "Stability", "Decision-making"])}
