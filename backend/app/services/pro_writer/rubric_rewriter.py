"""
Rubric rewriter service — calls GPT-4o mini to rewrite text aligned to a rubric.
"""
from __future__ import annotations

import json
import urllib.request

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.pro import RubricRewriteResponse

logger = get_logger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = 30


def _chat(messages: list[dict]) -> str:
    body = json.dumps({
        "model": settings.openai_model,
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 2000,
    }).encode("utf-8")

    req = urllib.request.Request(
        _OPENAI_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.openai_api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


def rewrite_for_rubric(text: str, rubric: str) -> RubricRewriteResponse:
    """Rewrite the essay so it explicitly addresses every rubric criterion."""
    system = (
        "You are an expert academic writing coach. Rewrite the provided essay so it clearly "
        "and explicitly addresses every criterion listed in the rubric. "
        "Keep the student's voice but strengthen weak sections. "
        "Return a JSON object with two keys: "
        "'rewritten' (the full rewritten essay) and "
        "'criteria_addressed' (a JSON array of short strings naming each rubric criterion you addressed). "
        "No markdown, just JSON."
    )
    user = f"Rubric:\n{rubric}\n\nEssay:\n{text}"

    try:
        raw = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        data: dict = json.loads(raw)
        criteria = data.get("criteria_addressed", [])
        if not isinstance(criteria, list):
            criteria = []
        return RubricRewriteResponse(
            rewritten=str(data.get("rewritten", "")),
            criteria_addressed=[str(c) for c in criteria],
        )
    except Exception as exc:
        logger.error("rubric_rewrite_error", extra={"error": str(exc)})
        raise
