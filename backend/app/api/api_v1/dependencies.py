from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.models.user import User
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.email == payload.sub).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return current_user


# Role hierarchy for team access control. The account owner (the User row)
# always has full access; invited TeamMembers are constrained by their role.
_ROLE_RANK = {'read_only': 0, 'manager': 1, 'accountant': 2, 'owner': 3}


def require_role(minimum: str):
    """Dependency factory enforcing a minimum team role for write actions.
    The primary account user is always treated as owner. Endpoints that
    mutate data should depend on this so an invited 'read_only' member
    cannot write."""
    def _guard(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> User:
        role = getattr(current_user, 'team_role', None)

        # Self-heal: the earliest-created user of a company is its owner. This
        # covers accounts created before team_role existed (NULL) or rows that
        # never got the default, so an owner is never locked out of their own
        # company's owner-only actions.
        if not role or role not in _ROLE_RANK:
            role = 'owner'
        if role != 'owner':
            try:
                earliest = (
                    db.query(User)
                    .filter(User.company_id == current_user.company_id)
                    .order_by(User.created_at.asc())
                    .first()
                )
                if earliest and earliest.id == current_user.id:
                    role = 'owner'
            except Exception:
                pass

        if _ROLE_RANK.get(role, 3) < _ROLE_RANK.get(minimum, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires '{minimum}' access or higher.",
            )
        return current_user
    return _guard
