import httpx
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()

ROLES = ["intake_staff", "senior_dispatcher", "admin"]


@lru_cache()
def _get_jwks() -> list:
    """Fetch and cache Supabase JWKS public keys."""
    r = httpx.get(
        f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["keys"]


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """Verify Supabase JWT using JWKS public key."""
    token = credentials.credentials
    try:
        keys = _get_jwks()
        # Try each key (usually just one)
        last_err = None
        for key in keys:
            try:
                payload = jwt.decode(
                    token,
                    key,
                    algorithms=[key.get("alg", "ES256")],
                    options={"verify_aud": False},
                )
                return payload
            except JWTError as e:
                last_err = e
                continue
        raise last_err or JWTError("No valid key found")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
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
