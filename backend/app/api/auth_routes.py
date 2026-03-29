"""
Auth routes backed by Supabase GoTrue.

POST /auth/register  — create account (email + password)
POST /auth/login     — sign in, returns access_token + refresh_token
POST /auth/logout    — invalidate session (requires Bearer token)
GET  /auth/me        — return current user info (requires Bearer token)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.auth import AuthUser, get_required_user
from app.core.config import settings
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request / Response models ─────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class UserResponse(BaseModel):
    user_id: str
    email: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_supabase() -> None:
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured.",
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRequest) -> TokenResponse:
    """Create a new account using email + password."""
    _require_supabase()
    from app.core.supabase import get_supabase

    client = get_supabase()
    try:
        response = client.auth.sign_up(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if response.user is None or response.session is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Check your email for a confirmation link.",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        user_id=str(response.user.id),
        email=response.user.email or "",
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: AuthRequest) -> TokenResponse:
    """Sign in with email + password. Returns JWT access and refresh tokens."""
    _require_supabase()
    from app.core.supabase import get_supabase

    client = get_supabase()
    try:
        response = client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        ) from exc

    if response.user is None or response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        user_id=str(response.user.id),
        email=response.user.email or "",
    )


@router.post("/logout", response_model=MessageResponse)
def logout(user: AuthUser = Depends(get_required_user)) -> MessageResponse:
    """Invalidate the current session. The client should discard its tokens."""
    _require_supabase()
    from app.core.supabase import get_supabase

    try:
        get_supabase().auth.sign_out()
    except Exception:
        pass  # Best-effort — client should clear tokens regardless
    return MessageResponse(message="Signed out successfully.")


@router.get("/me", response_model=UserResponse)
def me(user: AuthUser = Depends(get_required_user)) -> UserResponse:
    """Return basic info for the currently authenticated user."""
    return UserResponse(user_id=user.id, email=user.email)

