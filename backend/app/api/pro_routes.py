"""
Pro feature routes — Stripe checkout, webhook, status, and AI writing tools.

POST /pro/checkout        — create a Stripe Checkout session (auth required)
POST /pro/billing-portal  — create a Stripe Customer Portal session (auth required)
POST /pro/webhook         — handle Stripe events (no auth, uses Stripe signature)
GET  /pro/status          — return { is_pro: bool } for the current user
POST /pro/improve         — GPT-4o mini improvement suggestions (Pro only)
POST /pro/humanize        — GPT-4o mini humanise rewrite (Pro only)
POST /pro/rubric-rewrite  — GPT-4o mini rewrite to hit rubric criteria (Pro only)
"""

from __future__ import annotations

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from app.core.auth import AuthUser, get_required_user
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.pro import (
    HumanizeRequest,
    HumanizeResponse,
    ImproveRequest,
    ImproveResponse,
    RubricRewriteRequest,
    RubricRewriteResponse,
)

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
    client_secret: str


class BillingPortalResponse(BaseModel):
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

    try:
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
                "ui_mode": "embedded",
                "line_items": [{"price": settings.stripe_price_id, "quantity": 1}],
                "return_url": f"{origin}/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
                "metadata": {"supabase_user_id": user.id},
            }
        )
    except stripe.StripeError as exc:
        logger.error("stripe_checkout_error", extra={"user_id": user.id, "error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {exc.user_message or str(exc)}",
        )

    logger.info("checkout_session_created", extra={"user_id": user.id, "session_id": session.id})
    return CheckoutResponse(client_secret=session.client_secret or "")


@router.post("/billing-portal", response_model=BillingPortalResponse)
def create_billing_portal_session(
    user: AuthUser = Depends(get_required_user),
) -> BillingPortalResponse:
    """Create a Stripe Customer Portal session so the user can manage or cancel their subscription."""
    _require_stripe()
    client = _get_stripe_client()
    sb = _supabase()

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No billing account found. Please contact support@wrex.app.",
        )

    origin = settings.allowed_origins[0] if settings.allowed_origins else "http://localhost:5173"
    try:
        portal_session = client.billing_portal.sessions.create(
            params={
                "customer": stripe_customer_id,
                "return_url": origin,
            }
        )
    except stripe.StripeError as exc:
        logger.error("stripe_portal_error", extra={"user_id": user.id, "error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {exc.user_message or str(exc)}",
        )

    logger.info("billing_portal_session_created", extra={"user_id": user.id})
    return BillingPortalResponse(url=portal_session.url)


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
    except (stripe.SignatureVerificationError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature")

    sb = _supabase()
    event_type: str = event_obj.get("type", "")

    if event_type == "checkout.session.completed":
        session = event_obj["data"]["object"]
        user_id = session.get("metadata", {}).get("supabase_user_id")
        sub_id = session.get("subscription")
        if user_id:
            update_payload: dict = {"is_pro": True}
            if sub_id:
                update_payload["stripe_subscription_id"] = sub_id
            sb.table("profiles").update(update_payload).eq("id", user_id).execute()
            logger.info("pro_activated", extra={"user_id": user_id, "subscription_id": sub_id})

    elif event_type == "customer.subscription.created":
        # Fires shortly after checkout — captures the subscription ID reliably.
        sub = event_obj["data"]["object"]
        sub_id = sub.get("id")
        customer_id = sub.get("customer")
        if sub_id and customer_id:
            # Look up user by Stripe customer ID and store the subscription ID
            profile = (
                sb.table("profiles")
                .select("id, is_pro")
                .eq("stripe_customer_id", customer_id)
                .maybe_single()
                .execute()
            )
            if profile.data:
                sb.table("profiles").update(
                    {"stripe_subscription_id": sub_id, "is_pro": True}
                ).eq("stripe_customer_id", customer_id).execute()
                logger.info("subscription_id_stored", extra={"subscription_id": sub_id, "customer_id": customer_id})

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        sub = event_obj["data"]["object"]
        sub_id = sub.get("id")
        customer_id = sub.get("customer")
        if sub_id:
            sb.table("profiles").update({"is_pro": False}).eq(
                "stripe_subscription_id", sub_id
            ).execute()
            logger.info("pro_deactivated", extra={"subscription_id": sub_id})
        elif customer_id:
            # Fallback: deactivate by customer ID if subscription_id wasn't stored
            sb.table("profiles").update({"is_pro": False}).eq(
                "stripe_customer_id", customer_id
            ).execute()
            logger.info("pro_deactivated_by_customer", extra={"customer_id": customer_id})

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


@router.post("/sync-subscription", response_model=ProStatusResponse)
def sync_subscription(
    user: AuthUser = Depends(get_required_user),
) -> ProStatusResponse:
    """
    Verify the user's subscription directly with Stripe and sync is_pro.
    Call this after checkout completes in case the webhook was delayed or missed.
    """
    if not settings.stripe_configured or not settings.supabase_configured:
        return ProStatusResponse(is_pro=False)

    client = _get_stripe_client()
    sb = _supabase()

    profile = (
        sb.table("profiles")
        .select("stripe_customer_id, stripe_subscription_id, is_pro")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )

    if not profile.data:
        return ProStatusResponse(is_pro=False)

    customer_id: str | None = profile.data.get("stripe_customer_id")
    if not customer_id:
        return ProStatusResponse(is_pro=False)

    # Check Stripe for any active subscription on this customer
    try:
        subs = client.subscriptions.list(params={"customer": customer_id, "status": "active", "limit": 1})
        if subs.data:
            sub = subs.data[0]
            sb.table("profiles").update({
                "is_pro": True,
                "stripe_subscription_id": sub.id,
            }).eq("id", user.id).execute()
            logger.info("subscription_synced", extra={"user_id": user.id, "subscription_id": sub.id})
            return ProStatusResponse(is_pro=True)
    except stripe.StripeError as exc:
        logger.error("stripe_sync_error", extra={"user_id": user.id, "error": str(exc)})

    return ProStatusResponse(is_pro=bool(profile.data.get("is_pro")))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_pro(user: AuthUser) -> None:
    """Raise 403 if the user is not a Pro subscriber.

    is_pro is already resolved by _verify_token() when the JWT is validated —
    no extra DB round-trip needed here.
    """
    if not user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a Wrex Pro subscription.",
        )


def _require_openai() -> None:
    """Raise 503 if the OpenAI key has not been configured yet."""
    if not settings.openai_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI writing features are not yet configured. Please add your OpenAI API key.",
        )


# ── Pro AI endpoints ──────────────────────────────────────────────────────────

@router.post("/improve", response_model=ImproveResponse)
def pro_improve(
    payload: ImproveRequest,
    user: AuthUser = Depends(get_required_user),
) -> ImproveResponse:
    """Return sentence-level improvement suggestions (Pro only, GPT-4o mini)."""
    _require_pro(user)
    _require_openai()

    from app.services.pro_writer.writing_service import get_improve_suggestions
    suggestions = get_improve_suggestions(payload.text, payload.rubric)
    return ImproveResponse(suggestions=suggestions)


@router.post("/humanize", response_model=HumanizeResponse)
def pro_humanize(
    payload: HumanizeRequest,
    user: AuthUser = Depends(get_required_user),
) -> HumanizeResponse:
    """Rewrite text to sound more natural/human (Pro only, GPT-4o mini)."""
    _require_pro(user)
    _require_openai()

    from app.services.pro_writer.humanizer import humanize_text
    return humanize_text(payload.text, tone=payload.tone or "natural")


@router.post("/rubric-rewrite", response_model=RubricRewriteResponse)
def pro_rubric_rewrite(
    payload: RubricRewriteRequest,
    user: AuthUser = Depends(get_required_user),
) -> RubricRewriteResponse:
    """Rewrite text to address rubric criteria (Pro only, GPT-4o mini)."""
    _require_pro(user)
    _require_openai()

    from app.services.pro_writer.rubric_rewriter import rewrite_for_rubric
    return rewrite_for_rubric(payload.text, payload.rubric)
