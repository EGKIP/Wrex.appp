"""
Usage quota tracking and enforcement.

Strategy:
  - Anonymous (no JWT): 1 analysis/day tracked by IP in SQLite anonymous_usage table.
  - Authenticated (valid JWT): 3 analyses/day tracked by user_id in Supabase usage_logs table.

Both paths raise HTTP 429 when the limit is exceeded.
Returns a QuotaInfo dict so the route can attach it to the response.
"""

from __future__ import annotations

import sqlite3
from datetime import date
from typing import Optional, TypedDict

from fastapi import HTTPException, Request, status

from app.core.config import settings


class QuotaInfo(TypedDict):
    used: int
    limit: int
    remaining: int
    is_authenticated: bool


# ── Anonymous quota (SQLite) ───────────────────────────────────────────────────

def _anon_check_and_record(ip: str) -> QuotaInfo:
    """Check + record one anon usage by IP. Raises 429 if limit hit."""
    from app.db.session import get_connection

    today = str(date.today())
    limit = settings.anon_daily_limit

    with get_connection() as conn:
        row = conn.execute(
            "SELECT count FROM anonymous_usage WHERE ip = ? AND usage_date = ?",
            (ip, today),
        ).fetchone()

        used = row["count"] if row else 0

        if used >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Anonymous limit reached ({limit}/day). "
                    "Create a free account for more analyses."
                ),
            )

        if row:
            conn.execute(
                "UPDATE anonymous_usage SET count = count + 1 WHERE ip = ? AND usage_date = ?",
                (ip, today),
            )
        else:
            conn.execute(
                "INSERT INTO anonymous_usage (ip, usage_date, count) VALUES (?, ?, 1)",
                (ip, today),
            )
        conn.commit()

    new_used = used + 1
    return QuotaInfo(
        used=new_used,
        limit=limit,
        remaining=max(0, limit - new_used),
        is_authenticated=False,
    )


# ── Authenticated quota (Supabase) ────────────────────────────────────────────

def _auth_check_and_record(user_id: str) -> QuotaInfo:
    """Check + record one authenticated usage by user_id. Raises 429 if limit hit."""
    from app.core.supabase import get_supabase

    today = str(date.today())
    limit = settings.free_daily_limit
    client = get_supabase()

    # Count today's usage
    result = (
        client.table("usage_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("usage_date", today)
        .execute()
    )
    used = result.count or 0

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit reached ({limit}/day). Upgrade for unlimited analyses.",
        )

    # Record this usage
    client.table("usage_logs").insert(
        {"user_id": user_id, "usage_date": today}
    ).execute()

    new_used = used + 1
    return QuotaInfo(
        used=new_used,
        limit=limit,
        remaining=max(0, limit - new_used),
        is_authenticated=True,
    )


# ── Public dependency ──────────────────────────────────────────────────────────

def check_quota(
    request: Request,
    user: Optional[object] = None,
) -> QuotaInfo:
    """
    Call from route handlers. Pass the result of get_optional_user as `user`.
    Returns QuotaInfo for inclusion in the response.
    """
    if user is not None:
        return _auth_check_and_record(user.id)  # type: ignore[attr-defined]

    ip = request.client.host if request.client else "unknown"
    return _anon_check_and_record(ip)

