import json
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import logger
from app.services.alert_service import AlertService
from app.services.gemini_service import GeminiService
from app.services.health_score import HealthScoreService
from app.services.kpi_engine import KPIService
from app.services.recommendation_service import RecommendationService


PERSONALITY_INSTRUCTIONS = {
    'direct': 'Be blunt and to the point. Do not soften bad news. Lead with the most important fact.',
    'balanced': 'Be professional and balanced. Acknowledge both risks and positives fairly.',
    'encouraging': 'Be supportive and motivating while still being honest about risks. Frame challenges as solvable.',
    'analytical': 'Be highly data-driven. Reference specific numbers and percentages for every claim.',
}

REPORT_STYLE_INSTRUCTIONS = {
    'concise': 'Keep every explanation tight — one or two sentences maximum per point.',
    'detailed': 'Provide thorough explanations with context and reasoning for each point.',
    'executive': 'Write for a busy executive: lead with the bottom line, then brief supporting detail.',
}

SUMMARY_LENGTH_WORDS = {
    'short': 120,
    'medium': 250,
    'long': 450,
}

CATEGORY_BY_ALERT_TYPE = {
    'profit_drop': 'profitability',
    'revenue_drop': 'revenue_opportunity',
    'expense_spike': 'expense_spike',
    'inventory_shortage': 'inventory_risk',
    'inventory_overstock': 'inventory_risk',
    'customer_dependency': 'customer_risk',
    'health_score_risk': 'general',
}

CATEGORY_BY_RECOMMENDATION_TYPE = {
    'low_inventory': 'inventory_risk',
    'high_customer_dependency': 'customer_risk',
    'high_expenses': 'expense_spike',
    'low_profit_margin': 'profitability',
    'inventory_shortage': 'inventory_risk',
    'customer_dependency': 'customer_risk',
    'revenue_decline': 'revenue_opportunity',
    'growth_opportunity': 'growth_opportunity',
    'health_score_review': 'general',
}

PRIORITY_RANK = {'high': 0, 'medium': 1, 'low': 2}


class AIService:
    def __init__(self, session):
        self.session = session
        self.kpi_service = KPIService(session)
        self.health_service = HealthScoreService(session)
        self.alert_service = AlertService(session)
        self.recommendation_service = RecommendationService(session)

    @staticmethod
    def _preference_block(user) -> str:
        if user is None:
            personality = PERSONALITY_INSTRUCTIONS['balanced']
            style = REPORT_STYLE_INSTRUCTIONS['concise']
            words = SUMMARY_LENGTH_WORDS['medium']
        else:
            personality = PERSONALITY_INSTRUCTIONS.get(
                getattr(user, 'ai_personality', None), PERSONALITY_INSTRUCTIONS['balanced']
            )
            style = REPORT_STYLE_INSTRUCTIONS.get(
                getattr(user, 'ai_report_style', None), REPORT_STYLE_INSTRUCTIONS['concise']
            )
            words = SUMMARY_LENGTH_WORDS.get(
                getattr(user, 'ai_summary_length', None), SUMMARY_LENGTH_WORDS['medium']
            )

        return (
            f"Tone: {personality}\n"
            f"Style: {style}\n"
            f"Length: keep the full response under approximately {words} words."
        )

    def answer_question(self, company_id, question, user=None):
        context = self.get_business_context(company_id)

        revenue = context["kpis"]["revenue"]
        net_profit = context["kpis"]["net_profit"]
        profit_margin = context["kpis"]["profit_margin"]
        growth_rate = context["kpis"]["growth_rate"]

        health = context["health_score"]["health_score"]

        alert_details = "\n".join([
            f"Title: {alert.title} | Severity: {alert.severity} | {alert.description}"
            for alert in context["alerts"]
        ])

        recommendation_details = "\n".join([
            f"Title: {rec.title} | Priority: {rec.priority} | Reason: {rec.reason} | Actions: {', '.join(rec.actions)}"
            for rec in context["recommendations"]
        ])

        prompt = f"""
You are Business Copilot, an AI Virtual CFO.

{self._preference_block(user)}

Business Metrics (last 30 days):
Revenue: {revenue}
Net Profit: {net_profit}
Profit Margin: {profit_margin}%
Growth Rate: {growth_rate}%
Health Score: {health}

Business Alerts:
{alert_details if alert_details else "No active alerts"}

Business Recommendations:
{recommendation_details if recommendation_details else "No active recommendations"}

User Question:
{question}

Instructions:
- Act as a senior Virtual CFO using ONLY the data above plus general business reasoning.
- If the data above doesn't contain enough information to answer precisely, say so plainly instead of guessing numbers.
- Explain risks clearly and prioritize actions by business impact.
- Give specific, practical next steps the business owner can act on this week.
"""

        gemini = GeminiService()
        return gemini.generate_response(prompt)

    def generate_executive_summary(self, company_id, user=None):
        context = self.get_business_context(company_id)
        kpis = context["kpis"]
        health = context["health_score"]["health_score"]

        prompt = f"""
You are an experienced CFO preparing an Executive Summary.

{self._preference_block(user)}

Business Metrics (last 30 days):
Revenue: {kpis['revenue']}
Net Profit: {kpis['net_profit']}
Profit Margin: {kpis['profit_margin']}%
Growth Rate: {kpis['growth_rate']}%
Health Score: {health}

Open Alerts: {len(context['alerts'])}
Open Recommendations: {len(context['recommendations'])}

Generate:
1. Executive Summary
2. Key Risks
3. Top Priorities
4. Overall Assessment
"""

        gemini = GeminiService()
        return gemini.generate_response(prompt)

    def generate_monthly_report(self, company_id, user=None):
        context = self.get_business_context(company_id)
        kpis = context["kpis"]
        health = context["health_score"]["health_score"]

        prompt = f"""
Monthly Management Report

{self._preference_block(user)}

Revenue: {kpis['revenue']}
Net Profit: {kpis['net_profit']}
Profit Margin: {kpis['profit_margin']}%
Growth Rate: {kpis['growth_rate']}%
Health Score: {health}
"""

        gemini = GeminiService()
        return gemini.generate_response(prompt)

    def generate_financial_analysis(self, company_id, user=None):
        context = self.get_business_context(company_id)
        kpis = context["kpis"]
        health = context["health_score"]["health_score"]

        prompt = f"""
You are an experienced CFO and Financial Analyst.

{self._preference_block(user)}

Business Metrics (last 30 days):
Revenue: {kpis['revenue']}
Net Profit: {kpis['net_profit']}
Profit Margin: {kpis['profit_margin']}%
Growth Rate: {kpis['growth_rate']}%
Health Score: {health}

Open Alerts: {len(context['alerts'])}
Open Recommendations: {len(context['recommendations'])}

Generate:
1. Financial Health Assessment
2. Biggest Risk
3. Biggest Opportunity
4. Why Profit May Change
5. Top 3 Priority Actions
6. Overall Business Outlook
"""

        gemini = GeminiService()
        return gemini.generate_response(prompt)

    def generate_risk_assessment(self, company_id, user=None):
        context = self.get_business_context(company_id)
        kpis = context["kpis"]
        health = context["health_score"]["health_score"]

        alert_details = "\n".join([
            f"Title: {alert.title} | Severity: {alert.severity} | {alert.description}"
            for alert in context["alerts"]
        ])

        prompt = f"""
You are an experienced CFO and Risk Management Consultant.

{self._preference_block(user)}

Business Metrics (last 30 days):
Revenue: {kpis['revenue']}
Net Profit: {kpis['net_profit']}
Profit Margin: {kpis['profit_margin']}%
Growth Rate: {kpis['growth_rate']}%
Health Score: {health}

Alert Details:
{alert_details if alert_details else "No active alerts"}

Generate:
1. Revenue Risk Assessment
2. Expense Risk Assessment
3. Profitability Risk Assessment
4. Growth Risk Assessment
5. Operational Risk Assessment
6. Overall Risk Rating (Low / Medium / High)
7. Top 5 Risk Mitigation Actions
"""

        gemini = GeminiService()
        return gemini.generate_response(prompt)

    def generate_forecast(self, company_id, user=None):
        context = self.get_business_context(company_id)
        kpis = context["kpis"]
        health = context["health_score"]["health_score"]

        prompt = f"""
You are an experienced CFO and Business Forecasting Expert.

{self._preference_block(user)}

Current Business Metrics (last 30 days):
Revenue: {kpis['revenue']}
Net Profit: {kpis['net_profit']}
Profit Margin: {kpis['profit_margin']}%
Growth Rate: {kpis['growth_rate']}%
Health Score: {health}

Generate:
1. Revenue Forecast (Next 30 Days)
2. Profit Forecast (Next 30 Days)
3. Growth Forecast
4. Expense Forecast
5. Key Business Risks
6. Key Business Opportunities
7. Recommended Actions
"""

        gemini = GeminiService()
        return gemini.generate_response(prompt)

    def get_business_context(
        self,
        company_id,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ):
        kpis = self.kpi_service.calculate_kpis(company_id, start_date=start_date, end_date=end_date)
        health = self.health_service.calculate_health_score(
            company_id, start_date=kpis['period_start'], end_date=kpis['period_end']
        )
        alerts = self.alert_service.list_alerts(company_id, status="open")
        recommendations = self.recommendation_service.list_recommendations(company_id, status="open")
        customer_metrics = self.recommendation_service._get_customer_metrics(
            company_id, kpis['period_start'], kpis['period_end']
        )
        inventory_metrics = self.recommendation_service._get_inventory_metrics(
            company_id, kpis['period_start'], kpis['period_end']
        )

        return {
            "kpis": kpis,
            "health_score": health,
            "alerts": alerts,
            "recommendations": recommendations,
            "customer_metrics": customer_metrics,
            "inventory_metrics": inventory_metrics,
        }

    # ------------------------------------------------------------------
    # Dashboard AI Business Brief
    # ------------------------------------------------------------------

    @staticmethod
    def _headline_for_score(score: float, has_data: bool) -> str:
        if not has_data:
            return "Upload your business data to get your first AI Business Brief."
        if score >= 85:
            return "Your business is performing well with no urgent issues."
        if score >= 70:
            return "Generally healthy — a few areas are worth watching."
        if score >= 55:
            return "Some risk areas need attention this week."
        return "Multiple risk areas need immediate attention."

    def _deterministic_brief_items(self, context: Dict[str, Any]) -> List[Dict[str, str]]:
        kpis = context["kpis"]
        items: List[Dict[str, str]] = []

        if kpis["revenue"] == 0 and kpis["total_expenses"] == 0:
            return [{
                "category": "general",
                "priority": "high",
                "issue": "No financial data found for the last 30 days.",
                "cause": "No sales or expense records have been imported yet, or none fall within this date range.",
                "recommendation": "Upload a sales and expense CSV or XLSX file from the Upload page to unlock real recommendations.",
                "expected_impact": "Unlocks revenue, profit, cash flow, and risk insights tailored to your business.",
            }]

        for alert in context["alerts"]:
            category = CATEGORY_BY_ALERT_TYPE.get(alert.alert_type, "general")
            items.append({
                "category": category,
                "priority": "high" if alert.severity in ("critical", "high") else (
                    "medium" if alert.severity == "medium" else "low"
                ),
                "issue": alert.title,
                "cause": alert.description or "Detected from recent KPI and health score trends.",
                "recommendation": "Review the related recommendation below for specific next steps.",
                "expected_impact": "Reduces risk exposure if addressed promptly.",
            })

        for rec in context["recommendations"]:
            category = CATEGORY_BY_RECOMMENDATION_TYPE.get(rec.recommendation_type, "general")
            actions_text = " ".join(rec.actions[:2]) if rec.actions else "Review the recommendation details."
            items.append({
                "category": category,
                "priority": rec.priority or "medium",
                "issue": rec.title,
                "cause": rec.reason,
                "recommendation": actions_text,
                "expected_impact": rec.expected_impact or "Improves the related business health component.",
            })

        items.sort(key=lambda item: PRIORITY_RANK.get(item["priority"], 1))

        if not items:
            items.append({
                "category": "general",
                "priority": "low",
                "issue": "No active risks detected right now.",
                "cause": "Recent KPIs are within healthy ranges and no alerts are open.",
                "recommendation": "Keep monitoring weekly and check back after your next data upload.",
                "expected_impact": "Maintains current business health.",
            })

        return items[:6]

    @staticmethod
    def _extract_json(text: str):
        cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise

    def generate_dashboard_brief(self, company_id, user=None) -> Dict[str, Any]:
        context = self.get_business_context(company_id)
        kpis = context["kpis"]
        health_score = context["health_score"]["health_score"]
        has_data = kpis["revenue"] != 0 or kpis["total_expenses"] != 0

        items = self._deterministic_brief_items(context)
        headline = self._headline_for_score(health_score, has_data)

        if has_data and settings.gemini_api_key:
            try:
                prompt = f"""
You are Business Copilot, an AI Virtual CFO writing the top-of-dashboard brief.

{self._preference_block(user)}

Rewrite the following structured business signals in clear, natural CFO language.
Use ONLY the facts given — do not invent numbers, customers, or products that are not mentioned.
Keep "issue", "cause", and "recommendation" each to one short sentence. "expected_impact" should be a short, concrete statement (use rupee or percentage figures only if they already appear in the input).

Respond with ONLY a valid JSON array, no markdown fences, no commentary, matching exactly this shape:
[{{"category": "...", "priority": "high|medium|low", "issue": "...", "cause": "...", "recommendation": "...", "expected_impact": "..."}}]

Business metrics (last 30 days): revenue {kpis['revenue']}, net profit {kpis['net_profit']}, profit margin {kpis['profit_margin']}%, growth rate {kpis['growth_rate']}%, health score {health_score}.

Input signals:
{json.dumps(items)}
"""
                gemini = GeminiService()
                raw = gemini.generate_response(prompt)
                parsed = self._extract_json(raw)
                if isinstance(parsed, list) and len(parsed) == len(items):
                    cleaned_items = []
                    for original, candidate in zip(items, parsed):
                        if not isinstance(candidate, dict):
                            raise ValueError("Malformed brief item from model")
                        cleaned_items.append({
                            "category": candidate.get("category", original["category"]),
                            "priority": candidate.get("priority", original["priority"]),
                            "issue": str(candidate.get("issue", original["issue"]))[:300],
                            "cause": str(candidate.get("cause", original["cause"]))[:300],
                            "recommendation": str(candidate.get("recommendation", original["recommendation"]))[:300],
                            "expected_impact": str(candidate.get("expected_impact", original["expected_impact"]))[:300],
                        })
                    items = cleaned_items
            except Exception as exc:
                logger.warning("Dashboard brief AI enhancement failed, using deterministic brief: %s", exc)

        brief_text = "\n\n".join(
            f"[{item['priority'].upper()}] {item['issue']}\nReason: {item['cause']}\nAction: {item['recommendation']}\nExpected Impact: {item['expected_impact']}"
            for item in items
        )

        return {
            "headline": headline,
            "health_score": health_score,
            "items": items,
            "generated_at": datetime.utcnow(),
            "brief": brief_text,
        }
