"""
Pro feature routes — Stripe checkout, webhook, and status.

POST /pro/checkout  — create a Stripe Checkout session (auth required)
POST /pro/webhook   — handle Stripe events (no auth, uses Stripe signature)
GET  /pro/status    — return { is_pro: bool } for the current user
"""

from __future__ import annotations

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from app.core.auth import AuthUser, get_required_user
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/pro", tags=["pro"])
logger = get_logger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_stripe() -> None:
    if not settings.stripe_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured.",
        )


def _get_stripe_client() -> stripe.StripeClient:
    return stripe.StripeClient(settings.stripe_secret_key)


def _supabase():
    from app.core.supabase import get_supabase
    return get_supabase()


# ── Schemas ───────────────────────────────────────────────────────────────────

class CheckoutResponse(BaseModel):
    url: str


class ProStatusResponse(BaseModel):
    is_pro: bool


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout_session(
    user: AuthUser = Depends(get_required_user),
) -> CheckoutResponse:
    """Create a Stripe Checkout session for Wrex Pro ($9/month)."""
    _require_stripe()
    client = _get_stripe_client()
    sb = _supabase()

    # Look up or create a Stripe customer for this user
    profile = (
        sb.table("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )
    stripe_customer_id: str | None = (
        profile.data.get("stripe_customer_id") if profile.data else None
    )

    if not stripe_customer_id:
        customer = client.customers.create(
            params={"email": user.email, "metadata": {"supabase_user_id": user.id}}
        )
        stripe_customer_id = customer.id
        sb.table("profiles").update({"stripe_customer_id": stripe_customer_id}).eq(
            "id", user.id
        ).execute()

    origin = settings.allowed_origins[0] if settings.allowed_origins else "http://localhost:5173"
    session = client.checkout.sessions.create(
        params={
            "customer": stripe_customer_id,
            "mode": "subscription",
            "line_items": [{"price": settings.stripe_price_id, "quantity": 1}],
            "success_url": f"{origin}/?pro=success",
            "cancel_url": f"{origin}/?pro=cancel",
            "metadata": {"supabase_user_id": user.id},
        }
    )

    logger.info("checkout_session_created", extra={"user_id": user.id, "session_id": session.id})
    return CheckoutResponse(url=session.url or "")


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature", default=""),
) -> dict:
    """Stripe webhook — flip is_pro on the Supabase profile."""
    _require_stripe()
    payload = await request.body()

    try:
        event_obj = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature")

    sb = _supabase()
    event_type: str = event_obj.get("type", "")

    if event_type == "checkout.session.completed":
        session = event_obj["data"]["object"]
        user_id = session.get("metadata", {}).get("supabase_user_id")
        sub_id = session.get("subscription")
        if user_id:
            sb.table("profiles").update(
                {"is_pro": True, "stripe_subscription_id": sub_id}
            ).eq("id", user_id).execute()
            logger.info("pro_activated", extra={"user_id": user_id})

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        sub = event_obj["data"]["object"]
        sub_id = sub.get("id")
        if sub_id:
            sb.table("profiles").update({"is_pro": False}).eq(
                "stripe_subscription_id", sub_id
            ).execute()
            logger.info("pro_deactivated", extra={"subscription_id": sub_id})

    return {"received": True}


@router.get("/status", response_model=ProStatusResponse)
def get_pro_status(
    user: AuthUser = Depends(get_required_user),
) -> ProStatusResponse:
    """Return whether the current authenticated user has an active Pro subscription."""
    if not settings.supabase_configured:
        return ProStatusResponse(is_pro=False)

    sb = _supabase()
    profile = (
        sb.table("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )
    is_pro = bool(profile.data and profile.data.get("is_pro"))
    return ProStatusResponse(is_pro=is_pro)


# ── Legacy placeholder stubs (kept for backward compat) ───────────────────────

@router.post("/improve", response_model=MessageResponse)
def pro_improve_placeholder() -> MessageResponse:
    return MessageResponse(message="Pro writing tools are coming soon.")


@router.post("/humanize", response_model=MessageResponse)
def pro_humanize_placeholder() -> MessageResponse:
    return MessageResponse(message="Humanising support is planned for a future phase.")


@router.post("/grammar-check", response_model=MessageResponse)
def pro_grammar_placeholder() -> MessageResponse:
    return MessageResponse(message="Grammar guidance is planned for a future phase.")


@router.post("/rubric-rewrite", response_model=MessageResponse)
def pro_rubric_placeholder() -> MessageResponse:
    return MessageResponse(message="Rubric-based writing help is planned for a future phase.")


@router.post("/templates", response_model=MessageResponse)
def pro_templates_placeholder() -> MessageResponse:
    return MessageResponse(message="Curated writing templates are planned for a future phase.")
