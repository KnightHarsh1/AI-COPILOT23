import google.generativeai as genai

from app.core.config import settings
from app.core.logging import logger

_configured = False


def _ensure_configured() -> bool:
    global _configured
    if not settings.gemini_api_key:
        return False
    if not _configured:
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True
    return True


class GeminiService:
    def __init__(self):
        self.available = _ensure_configured()
        if self.available:
            self.model = genai.GenerativeModel("gemini-2.5-flash")

    def generate_response(self, prompt: str) -> str:
        if not self.available:
            return (
                "AI service is not configured yet.\n\n"
                "Set GEMINI_API_KEY in the backend environment to enable AI-generated "
                "summaries, forecasts, and chat answers."
            )

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as exc:
            logger.error("Gemini API error: %s", exc)
            return (
                "AI service temporarily unavailable.\n\n"
                "Possible reasons:\n"
                "- Gemini quota exceeded\n"
                "- Invalid API key\n"
                "- Network issue\n\n"
                "Please try again later."
            )
