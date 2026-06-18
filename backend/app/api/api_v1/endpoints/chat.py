from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.dependencies import (
    get_db,
    get_current_active_user,
)

from app.db.models.user import User
from app.db.session import get_db

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
)

from app.services.ai_service import AIService

router = APIRouter()


@router.post("/", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    
    ai_service = AIService(db)

    answer = ai_service.answer_question(
        current_user.company_id,
        request.message,
        current_user,
    )

    return {
        "answer": answer
    }