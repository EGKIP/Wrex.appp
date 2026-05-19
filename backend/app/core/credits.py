"""
Monthly AI credit accounting for paid Pro endpoints.

Credits are currently one-to-one with OpenAI total_tokens. The backend uses
Supabase RPCs for atomic ledger updates when they are installed, and fails open
for infrastructure/configuration problems so active Pro users are not blocked by
metering outages.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Mapping, TypedDict
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class OpenAITokenUsage(TypedDict, total=False):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True)
class CreditPeriod:
    starts_on: date
    ends_on: date


@dataclass(frozen=True)
class CreditBalance:
    monthly_credits: int
    remaining_credits: int
    period_start: date
    period_end: date
    metering_available: bool = True


def current_credit_period(now: datetime | None = None) -> CreditPeriod:
    """Return the UTC calendar-month period used for included Pro AI credits."""
    current = now or datetime.now(timezone.utc)
    starts_on = date(current.year, current.month, 1)
    if current.month == 12:
        ends_on = date(current.year + 1, 1, 1)
    else:
        ends_on = date(current.year, current.month + 1, 1)
    return CreditPeriod(starts_on=starts_on, ends_on=ends_on)


def _default_balance(metering_available: bool) -> CreditBalance:
    period = current_credit_period()
    return CreditBalance(
        monthly_credits=settings.pro_monthly_ai_credits,
        remaining_credits=settings.pro_monthly_ai_credits,
        period_start=period.starts_on,
        period_end=period.ends_on,
        metering_available=metering_available,
    )


def _coerce_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _first_present(data: Mapping[str, Any], keys: tuple[str, ...], default: Any) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def _coerce_balance(data: Any) -> CreditBalance:
    """Normalize common Supabase RPC result shapes into a CreditBalance."""
    if isinstance(data, list):
        data = data[0] if data else {}

    if isinstance(data, Mapping):
        period = current_credit_period()
        period_start = data.get("period_start") or data.get("period_starts_on")
        period_end = data.get("period_end") or data.get("period_ends_on")
        return CreditBalance(
            monthly_credits=_coerce_int(
                _first_present(data, ("monthly_credits", "credit_limit"), settings.pro_monthly_ai_credits),
                settings.pro_monthly_ai_credits,
            ),
            remaining_credits=_coerce_int(
                _first_present(data, ("remaining_credits", "credits_remaining"), settings.pro_monthly_ai_credits),
                settings.pro_monthly_ai_credits,
            ),
            period_start=date.fromisoformat(str(period_start)) if period_start else period.starts_on,
            period_end=date.fromisoformat(str(period_end)) if period_end else period.ends_on,
        )

    remaining = _coerce_int(data, settings.pro_monthly_ai_credits)
    period = current_credit_period()
    return CreditBalance(
        monthly_credits=settings.pro_monthly_ai_credits,
        remaining_credits=remaining,
        period_start=period.starts_on,
        period_end=period.ends_on,
    )


def _call_rpc(name: str, params: dict[str, Any]) -> Any:
    from app.core.supabase import get_supabase

    return get_supabase().rpc(name, params).execute().data


def ensure_ai_credits_available(user_id: str, endpoint: str) -> CreditBalance:
    """
    Ensure the user's current Pro credit period exists and has credits remaining.

    Returns a fail-open balance when Supabase/RPC metering is unavailable.
    Raises 402 only when the ledger is available and confirms no remaining credit.
    """
    if not settings.supabase_configured or not settings.ai_credit_metering_enabled:
        return _default_balance(metering_available=False)

    period = current_credit_period()
    params = {
        "p_user_id": user_id,
        "p_period_start": period.starts_on.isoformat(),
        "p_period_end": period.ends_on.isoformat(),
        "p_monthly_credits": settings.pro_monthly_ai_credits,
    }

    try:
        balance = _coerce_balance(_call_rpc("wrex_get_or_create_ai_credit_balance", params))
    except Exception as exc:
        logger.warning(
            "ai_credit_check_failed_open",
            extra={"user_id": user_id, "endpoint": endpoint, "error": str(exc)},
        )
        return _default_balance(metering_available=False)

    if balance.remaining_credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                "Monthly Pro AI credits are exhausted. Credits reset at the start "
                "of your next monthly period."
            ),
        )

    return balance


def debit_ai_credits(
    *,
    user_id: str,
    endpoint: str,
    model: str,
    usage: OpenAITokenUsage,
    request_id: str | None = None,
) -> CreditBalance:
    """
    Debit actual OpenAI tokens after a successful paid AI call.

    If metering infrastructure is unavailable, logs and returns a fail-open
    balance. This preserves Stripe test mode and avoids blocking paid users for
    transient Supabase/RPC issues.
    """
    credits = _coerce_int(usage.get("total_tokens"), 0)
    if credits <= 0:
        logger.warning("ai_credit_debit_skipped_zero_tokens", extra={"user_id": user_id, "endpoint": endpoint})
        return ensure_ai_credits_available(user_id, endpoint)

    if not settings.supabase_configured or not settings.ai_credit_metering_enabled:
        return _default_balance(metering_available=False)

    period = current_credit_period()
    params = {
        "p_user_id": user_id,
        "p_request_id": request_id or str(uuid4()),
        "p_endpoint": endpoint,
        "p_model": model,
        "p_prompt_tokens": _coerce_int(usage.get("prompt_tokens"), 0),
        "p_completion_tokens": _coerce_int(usage.get("completion_tokens"), 0),
        "p_total_tokens": credits,
        "p_credits": credits,
        "p_period_start": period.starts_on.isoformat(),
        "p_period_end": period.ends_on.isoformat(),
        "p_monthly_credits": settings.pro_monthly_ai_credits,
    }

    try:
        balance = _coerce_balance(_call_rpc("wrex_debit_ai_credits", params))
        logger.info(
            "ai_credits_debited",
            extra={
                "user_id": user_id,
                "endpoint": endpoint,
                "model": model,
                "credits": credits,
                "remaining_credits": balance.remaining_credits,
            },
        )
        return balance
    except Exception as exc:
        logger.warning(
            "ai_credit_debit_failed_open",
            extra={"user_id": user_id, "endpoint": endpoint, "credits": credits, "error": str(exc)},
        )
        return _default_balance(metering_available=False)


def initialize_ai_credit_period(user_id: str) -> CreditBalance:
    """Best-effort creation of the current monthly period after Pro activation."""
    try:
        return ensure_ai_credits_available(user_id, endpoint="pro_activation")
    except HTTPException as exc:
        logger.warning(
            "ai_credit_period_init_skipped",
            extra={"user_id": user_id, "status_code": exc.status_code, "detail": exc.detail},
        )
        return _default_balance(metering_available=False)
