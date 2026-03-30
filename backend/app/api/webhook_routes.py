"""
Webhook endpoints called by Supabase Auth Hooks.

POST /webhook/user-signup
    Triggered by Supabase when a new row is inserted into auth.users.
    Sends a welcome email via the Resend API (urllib — no extra deps).

Security: every request must carry an `x-webhook-secret` header whose value
matches WREX_WEBHOOK_SECRET.  Set the same value in the Supabase dashboard
under Authentication → Hooks → Send Email Hook (or a custom HTTP hook).
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request, Response, status

from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter(prefix="/webhook", tags=["webhook"])
logger = get_logger(__name__)


# ── Welcome email HTML ────────────────────────────────────────────────────────

def _welcome_html(email: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <tr><td style="background:#f0fdf4;padding:28px 32px;border-bottom:1px solid #e2e8f0">
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px">✍️ Wrex.app</p>
    </td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:700">Welcome to Wrex!</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
        Hi {email.split("@")[0]}, glad you're here. Wrex helps you write to your rubric — every time.
      </p>
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a">Here's what you can do right now (free):</p>
      <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.8;color:#334155">
        <li>Paste your essay and get an AI detection score</li>
        <li>Check grammar and spelling with one click</li>
        <li>Add your rubric and see which criteria you've covered</li>
      </ul>
      <a href="https://wrex.app/#analyzer"
         style="display:inline-block;background:#a3e635;color:#0f172a;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">
        Start writing →
      </a>
      <p style="margin:28px 0 0;font-size:13px;color:#94a3b8">
        Want unlimited analyses + AI rewrites?
        <a href="https://wrex.app/#pricing" style="color:#65a30d;text-decoration:none">Upgrade to Pro — $9/mo</a>
      </p>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
      You're receiving this because you just signed up at wrex.app.
    </td></tr>
  </table>
</body>
</html>
"""


def _send_welcome_email(to_email: str) -> None:
    """POST to Resend API using urllib (no third-party http lib required)."""
    payload = json.dumps({
        "from": settings.resend_from,
        "to": [to_email],
        "subject": "Welcome to Wrex ✍️",
        "html": _welcome_html(to_email),
    }).encode()

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "wrex-backend/1.0",  # required — Cloudflare blocks urllib's default UA
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info("welcome_email_sent", extra={"to": to_email, "status": resp.status})
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        logger.error("welcome_email_failed", extra={"to": to_email, "status": exc.code, "body": body})
        raise


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/user-signup")
async def user_signup_hook(
    request: Request,
    x_webhook_secret: Optional[str] = Header(default=None),
) -> Response:
    """
    Called by Supabase Auth Hook when a new user is created.

    Expected JSON body (Supabase sends this automatically):
        { "type": "INSERT", "record": { "email": "...", ... } }
    """
    # 1. Verify shared secret
    if not settings.webhook_secret:
        logger.warning("webhook_secret not configured — skipping verification")
    elif x_webhook_secret != settings.webhook_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret.")

    # 2. Parse body
    try:
        body: dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body.")

    # Supabase auth hook payload: body["record"]["email"]
    record = body.get("record") or {}
    email: str = record.get("email", "")

    if not email:
        logger.warning("user_signup_hook: no email in payload", extra={"body": body})
        return Response(status_code=204)

    # 3. Send welcome email (only if Resend is configured)
    if not settings.resend_configured:
        logger.info("resend_not_configured — skipping welcome email", extra={"to": email})
        return Response(status_code=204)

    try:
        _send_welcome_email(email)
    except Exception as exc:
        # Log but don't fail — Supabase would retry on non-2xx
        logger.error("welcome_email_error", extra={"to": email, "error": str(exc)})

    return Response(status_code=204)

