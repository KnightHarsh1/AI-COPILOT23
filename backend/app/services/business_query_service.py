"""Natural-language business query. Lets an owner ask plain questions
("who owes me the most?", "what's my profit?", "which products are dead
stock?") and answers from ALREADY-COMPUTED, safe data — never by executing
model-generated SQL. We assemble a compact factual context from the existing
services and let the LLM phrase the answer; if the LLM is unavailable we
still return the relevant figures directly.
"""

from sqlalchemy.orm import Session

from app.services.kpi_engine import KPIService
from app.services.gemini_service import GeminiService
from app.services.intelligence.collections_service import CollectionsIntelligenceService
from app.services.intelligence.product_service import ProductIntelligenceService


def _inr(n):
    try:
        n = float(n or 0)
    except Exception:
        return str(n)
    if abs(n) >= 1e7: return f"₹{n/1e7:.2f}Cr"
    if abs(n) >= 1e5: return f"₹{n/1e5:.2f}L"
    if abs(n) >= 1e3: return f"₹{n/1e3:.0f}K"
    return f"₹{n:.0f}"


class BusinessQueryService:
    def __init__(self, session: Session):
        self.session = session

    def _facts(self, company_id) -> dict:
        kpis = KPIService(self.session).calculate_kpis(company_id)
        facts = {
            'revenue': _inr(kpis.get('revenue')),
            'net_profit': _inr(kpis.get('net_profit')),
            'profit_margin': f"{kpis.get('profit_margin', 0):.1f}%",
            'total_expenses': _inr(kpis.get('total_expenses')),
            'cash_position': _inr(kpis.get('cash_position')),
            'outstanding_receivables': _inr(kpis.get('outstanding_receivables')),
            'receivable_days': f"{kpis.get('receivable_days', 0):.0f} days",
            'runway_months': f"{kpis.get('runway_months', 0):.1f} months",
            'vendor_dependency': f"{kpis.get('vendor_dependency', 0):.0f}%",
            'churn_risk': f"{kpis.get('churn_risk', 0):.0f}%",
        }
        try:
            col = CollectionsIntelligenceService(self.session).analyze(company_id)
            if col.get('available'):
                facts['top_overdue_customer'] = col.get('top_customer_name')
                facts['collection_efficiency'] = f"{col.get('collection_efficiency', 0)}%"
        except Exception:
            pass
        try:
            prod = ProductIntelligenceService(self.session).analyze(company_id)
            if prod.get('available'):
                facts['dead_stock_count'] = len(prod.get('dead_stock', []) or [])
                facts['stockout_risk_count'] = len(prod.get('stockout_risk', []) or [])
                facts['inventory_value'] = _inr(prod.get('inventory_value'))
        except Exception:
            pass
        return facts

    def ask(self, company_id, question: str) -> dict:
        facts = self._facts(company_id)
        fact_lines = "\n".join(f"- {k.replace('_', ' ')}: {v}" for k, v in facts.items() if v is not None)

        gemini = GeminiService()
        if gemini.available:
            prompt = (
                "You are an AI CFO for an Indian SME owner. Answer the owner's question "
                "in 2-3 plain sentences using ONLY the figures below. If the figures don't "
                "contain the answer, say what data they should upload to get it. Be concrete "
                "and cite the relevant number.\n\n"
                f"Question: {question}\n\nBusiness figures:\n{fact_lines}"
            )
            answer = gemini.generate_response(prompt)
        else:
            answer = ("Here are your latest figures:\n" + fact_lines +
                      "\n\n(Connect the AI assistant for conversational answers.)")

        return {'question': question, 'answer': answer, 'based_on': facts}
