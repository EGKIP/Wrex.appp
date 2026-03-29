"""
Humanizer service — calls GPT-4o mini to rewrite AI-sounding text more naturally.
"""
from __future__ import annotations

import json
import urllib.request

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.pro import HumanizeResponse

logger = get_logger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = 30


def _chat(messages: list[dict]) -> str:
    body = json.dumps({
        "model": settings.openai_model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1500,
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


def humanize_text(text: str) -> HumanizeResponse:
    """Rewrite the text to sound more natural and less AI-generated."""
    system = (
        "You are a writing editor who specialises in making AI-generated text sound natural "
        "and human-written. Preserve the meaning and academic tone but vary sentence structure, "
        "reduce repetition, and use more conversational transitions. "
        "Return a JSON object with two keys: "
        "'rewritten' (the full rewritten text) and "
        "'changes_summary' (one sentence describing what you changed, e.g. 'Varied sentence length and reduced passive voice in 4 places.'). "
        "No markdown, just JSON."
    )
    user = f"Original text:\n{text}"

    try:
        raw = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        data: dict = json.loads(raw)
        return HumanizeResponse(
            rewritten=str(data.get("rewritten", "")),
            changes_summary=str(data.get("changes_summary", "")),
        )
    except Exception as exc:
        logger.error("humanize_error", extra={"error": str(exc)})
        raise
