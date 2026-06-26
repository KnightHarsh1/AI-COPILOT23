"""Executive Intelligence — CEO-level synthesis. Pulls the top risk and
opportunity from every engine, ranks them, and produces today/week/month focus
plus an executive score and priority index. Reuses the Action Center and the
other intelligence engines; computes nothing new from raw data itself.
"""
from sqlalchemy.orm import Session

from app.services.intelligence.trust import trust_block, explain, health_band


def _safe(fn, default=None):
    try:
        return fn()
    except Exception:
        return default


_PR = {"critical": 0, "high": 1, "medium": 2, "low": 3}


class ExecutiveIntelligenceService:
    def __init__(self, session: Session):
        self.session = session

    def analyze(self, company_id) -> dict:
        s = self.session
        from app.services.intelligence.action_center_service import ActionCenterService
        from app.services.health_score import HealthScoreService

        ac = _safe(lambda: ActionCenterService(s).generate(company_id), {}) or {}
        health = _safe(lambda: HealthScoreService(s).get_latest(company_id), None)
        if health is None:
            health = _safe(lambda: HealthScoreService(s).calculate_health_score(company_id), None)
        health_val = None
        if isinstance(health, dict):
            health_val = health.get("score") or health.get("overall_score")

        today = ac.get("today") or []
        week = ac.get("week") or []
        month = ac.get("month") or []
        all_actions = today + week + month

        if not all_actions and health_val is None:
            return {"available": False, "reason": "Import business data to generate the executive view.", **self._meta(0)}

        risks = [a for a in all_actions if a.get("priority") in ("critical", "high")]
        risks.sort(key=lambda a: _PR.get(a.get("priority"), 2))
        top_risk = risks[0] if risks else None
        opp = next((a for a in all_actions if "opportunit" in (a.get("category") or "")), None)

        # Executive score: blend health with how many critical items are open.
        crit = len([a for a in all_actions if a.get("priority") == "critical"])
        score = int(health_val) if health_val is not None else 60
        score = max(0, min(100, score - crit * 6))
        # Priority index: weighted count of open items (0-100, higher=busier).
        priority_index = min(100, crit * 25 + len(risks) * 8 + len(all_actions) * 2)

        def fmt(a):
            return {"title": a.get("title"), "reason": a.get("reason"),
                    "action": a.get("recommended_action"), "priority": a.get("priority"),
                    "category": a.get("category")}

        return {
            "available": True,
            "name": "Executive Intelligence",
            "health_score": score,
            "health_band": health_band(score),
            "top_risk": top_risk.get("title") if top_risk else "No critical risks today.",
            "top_opportunity": opp.get("title") if opp else None,
            "kpis": [
                {"label": "Executive score", "value": f"{score}/100",
                 "explain": explain("Executive Score", "business health adjusted for open critical items", ["Health score", "Action center"], confidence=72)},
                {"label": "Priority index", "value": f"{priority_index}/100",
                 "explain": explain("Priority Index", "weighted count of open critical/high actions", ["Action center"], records=len(all_actions), confidence=72)},
                {"label": "Critical items", "value": str(crit),
                 "explain": explain("Critical Items", "count of critical-priority actions", ["Action center"], confidence=80)},
                {"label": "Open actions", "value": str(len(all_actions)),
                 "explain": explain("Open Actions", "all actions across today/week/month", ["Action center"], confidence=85)},
            ],
            "todays_priority": [fmt(a) for a in today[:3]],
            "weekly_focus": [fmt(a) for a in week[:3]],
            "monthly_focus": [fmt(a) for a in month[:3]],
            "actions": [{"priority": a.get("priority", "medium"), "label": a.get("title")} for a in (today[:3] or risks[:3])],
            "executive_summary": {
                "what_happened": f"{crit} critical and {len(risks)} high-priority items are open.",
                "why": (top_risk.get("reason") if top_risk else "Operations are stable."),
                "what_next": (top_risk.get("recommended_action") if top_risk else "Maintain current course; review weekly focus."),
            },
            "trust": self._meta(72)["trust"],
        }

    def _meta(self, confidence):
        return {"trust": trust_block(
            ["Health score", "Action center", "All engines"], confidence=confidence,
            what="The CEO view: the single most important risk, opportunity and priority for today, this week and this month.",
            how="Ranks every engine's actions by priority; executive score = health adjusted for open critical items.",
            impact_level="HIGH", impact_areas=["Focus", "Decision-making", "Time"])}
