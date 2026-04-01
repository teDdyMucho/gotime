from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()

ROLES = ["intake_staff", "senior_dispatcher", "admin"]


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """Verify Supabase JWT and return decoded payload."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_anon_key,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_user(payload: dict = Depends(verify_token)) -> dict:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No user ID in token")
    return {
        "user_id": user_id,
        "email": payload.get("email", ""),
        "role": payload.get("user_metadata", {}).get("role", "intake_staff"),
    }


def require_role(*allowed_roles: str):
    """Dependency factory — restrict endpoint to specific roles."""
    def _check(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user['role']}' is not authorized for this action",
            )
        return user
    return _check


# Convenience role dependencies
require_intake_or_above = require_role("intake_staff", "senior_dispatcher", "admin")
require_dispatcher_or_above = require_role("senior_dispatcher", "admin")
require_admin = require_role("admin")
