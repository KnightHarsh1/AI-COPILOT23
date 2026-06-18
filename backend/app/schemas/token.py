from pydantic import BaseModel
from typing import Optional

from app.schemas.user import UserRead


class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class TokenWithUser(Token):
    user: UserRead


class TokenPayload(BaseModel):
    sub: str
    company_id: Optional[str] = None
    exp: int
