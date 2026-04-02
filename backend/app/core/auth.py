"""
FastAPI dependencies for Supabase JWT verification.

Usage:
    # Require auth — raises 401 if no valid token
    @router.get("/protected")
    def protected(user: AuthUser = Depends(get_required_user)):
        ...

    # Optional auth — user is None for anonymous requests
    @router.post("/analyze")
    def analyze(user: AuthUser | None = Depends(get_optional_user)):
        ...
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    """Minimal user info extracted from a verified Supabase JWT."""

    id: str               # Supabase user UUID
    email: str            # user email
    is_pro: bool = False  # fetched from profiles table; False if profile missing


def _verify_token(token: str) -> AuthUser:
    """
    Verify a Supabase JWT using the admin client's get_user() method.
    Raises HTTPException(401) on any failure.
    """
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured.",
        )

    try:
        from app.core.supabase import get_supabase

        client = get_supabase()
        response = client.auth.get_user(token)

        if response is None or response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )

        user = response.user

        # Fetch is_pro from profiles table — default False if row missing or error
        is_pro = False
        try:
            profile_resp = (
                client.table("profiles")
                .select("is_pro")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )
            if profile_resp.data:
                is_pro = bool(profile_resp.data.get("is_pro", False))
        except Exception:
            pass  # Non-fatal: new users may not have a profile row yet

        return AuthUser(id=str(user.id), email=user.email or "", is_pro=is_pro)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[AuthUser]:
    """
    Returns the authenticated user, or None if no token is provided.
    Raises 401 only if a token is provided but invalid.
    """
    if credentials is None:
        return None
    return _verify_token(credentials.credentials)


def get_required_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> AuthUser:
    """
    Returns the authenticated user. Raises 401 if no valid token is provided.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _verify_token(credentials.credentials)

