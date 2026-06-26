"""Shared trust-layer helpers used by every intelligence module so the UI can
render a consistent 'what / how / impact / explain-this-number' block.

No fabricated values: callers pass real sources, record counts and confidence.
"""


def trust_block(sources, records=None, confidence=None, last_updated=None,
                what=None, how=None, impact_level="MEDIUM", impact_areas=None):
    return {
        "what": what,
        "how": {"data_sources": sources or [], "logic": how},
        "impact": {"level": impact_level, "areas": impact_areas or []},
        "data_sources": sources or [],
        "records_used": records,
        "confidence": confidence,
        "last_updated": last_updated,
    }


def explain(metric_name, formula, sources, records=None, confidence=None, last_updated=None):
    """Per-KPI 'Explain This Number' payload."""
    return {
        "metric": metric_name,
        "formula": formula,
        "data_sources": sources or [],
        "records_used": records,
        "confidence": confidence,
        "last_updated": last_updated,
    }


def health_band(score):
    if score is None:
        return "unknown"
    if score >= 75:
        return "healthy"
    if score >= 50:
        return "watch"
    return "critical"


def inr(value) -> str:
    try:
        v = float(value)
    except Exception:
        return str(value)
    if abs(v) >= 1e7:
        return f"₹{v / 1e7:.2f}Cr"
    if abs(v) >= 1e5:
        return f"₹{v / 1e5:.2f}L"
    if abs(v) >= 1e3:
        return f"₹{v / 1e3:.0f}K"
    return f"₹{v:.0f}"
