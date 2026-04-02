"""
Writing improvement service — calls GPT-4o mini to suggest sentence rewrites.
"""
from __future__ import annotations

import json
import urllib.request
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.pro import ImproveSuggestion

logger = get_logger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = 30


def _chat(messages: list[dict]) -> str:
    """Make a single chat-completions request, log token usage, and return the content string."""
    body = json.dumps({
        "model": settings.openai_model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 2500,
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

    usage = data.get("usage", {})
    logger.info(
        "openai_tokens",
        extra={
            "service": "improve",
            "model": settings.openai_model,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        },
    )
    return data["choices"][0]["message"]["content"]


def get_improve_suggestions(
    text: str, rubric: Optional[str] = None
) -> list[ImproveSuggestion]:
    """Return up to 8 sentence-level improvement suggestions."""
    rubric_section = f"\n\nRubric:\n{rubric}" if rubric else ""

    system = (
        "You are an expert writing coach helping a student improve their essay. "
        "Identify sentences that are weak, vague, overly formal, repetitive, or fail to address the rubric. "
        "For EACH weak sentence you find, output a JSON object with exactly these keys: "
        "'sentence' (the original sentence verbatim), "
        "'issue' (a short explanation of why it is weak — 10–20 words), "
        "'rewrite' (an improved version of the sentence). "
        "Return a JSON array containing between 5 and 8 such objects. "
        "Cover a variety of issue types (clarity, evidence, structure, tone, repetition). "
        "Output ONLY the raw JSON array — no markdown, no code fences, no extra text."
    )
    user = f"Essay:\n{text}{rubric_section}"

    try:
        raw = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        items: list[dict] = json.loads(raw)
        return [
            ImproveSuggestion(
                sentence=str(i.get("sentence", "")),
                issue=str(i.get("issue", "")),
                rewrite=str(i.get("rewrite", "")),
            )
            for i in items
            if isinstance(i, dict)
        ]
    except Exception as exc:
        logger.error("improve_error", extra={"error": str(exc)})
        raise
