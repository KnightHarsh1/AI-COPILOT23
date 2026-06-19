"""Turns a matched, quantified signal into a plain-language card:
what happened, why it matters to *you*, and one SME-sized action.

AI phrases it when available; a deterministic template produces a fully
useful card when AI is off. Mirrors the graceful-degradation contract of
the rest of the platform -- AI makes cards eloquent, never required.
"""

import json
import re

from app.services.gemini_service import GeminiService


def _format_inr(amount) -> str:
    if amount is None:
        return None
    n = float(amount)
    if abs(n) >= 1.0e7:
        return f"₹{n / 1.0e7:.1f}Cr".replace('.0Cr', 'Cr')
    if abs(n) >= 1.0e5:
        return f"₹{n / 1.0e5:.1f}L".replace('.0L', 'L')
    if abs(n) >= 1.0e3:
        return f"₹{n / 1.0e3:.0f}K"
    return f"₹{n:.0f}"


def _extract_json(text: str):
    if not text:
        return None
    cleaned = re.sub(r'^```(?:json)?\s*', '', text.strip())
    cleaned = re.sub(r'\s*```$', '', cleaned)
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        start, end = cleaned.find('{'), cleaned.rfind('}')
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except (json.JSONDecodeError, ValueError):
                return None
    return None


class MarketTranslationService:
    def __init__(self, gemini: GeminiService = None):
        self.gemini = gemini or GeminiService()

    def _template_card(self, match, company):
        sig = match['signal']
        impact_text = ''
        if match['impact_low'] is not None:
            impact_text = f" Estimated impact: {_format_inr(match['impact_low'])}–{_format_inr(match['impact_high'])}."
        if sig.direction == 'opportunity':
            action = 'Review how to capture this — check pricing, stock, or eligibility this week.'
        else:
            action = 'Review your exposure and plan a mitigating step this week.'
        return {
            'headline': sig.title,
            'why_it_matters': f"{sig.summary}{impact_text}",
            'recommended_action': action,
        }

    def translate_batch(self, matches, company):
        """Returns {signal_id: card_dict}. One AI call for all matches;
        falls back to templates per-card on any failure."""
        cards = {str(m['signal'].id): self._template_card(m, company) for m in matches}

        if not matches or not self.gemini.available:
            return cards

        items = []
        for m in matches:
            sig = m['signal']
            impact = ''
            if m['impact_low'] is not None:
                impact = f"{_format_inr(m['impact_low'])} to {_format_inr(m['impact_high'])}"
            items.append(
                f'- id "{sig.id}": event="{sig.title}"; detail="{sig.summary}"; '
                f'direction={sig.direction}; estimated_impact="{impact}"'
            )

        prompt = (
            "You are a CFO advising an Indian SME owner in plain English. "
            f"The business is in the {company.industry} industry.\n\n"
            "For each market event below, write a short card with exactly these keys: "
            "headline (<=8 words), why_it_matters (1-2 sentences, mention the rupee impact if given), "
            "recommended_action (one concrete, doable step for a small business).\n\n"
            "Events:\n" + "\n".join(items) + "\n\n"
            "Respond with ONLY a JSON object mapping each id to its card, no markdown:\n"
            '{"<id>": {"headline": "...", "why_it_matters": "...", "recommended_action": "..."}}'
        )

        parsed = _extract_json(self.gemini.generate_response(prompt))
        if not isinstance(parsed, dict):
            return cards

        for sid, card in parsed.items():
            if isinstance(card, dict) and sid in cards:
                cards[sid] = {
                    'headline': str(card.get('headline') or cards[sid]['headline'])[:240],
                    'why_it_matters': str(card.get('why_it_matters') or cards[sid]['why_it_matters']),
                    'recommended_action': str(card.get('recommended_action') or cards[sid]['recommended_action']),
                }
        return cards
