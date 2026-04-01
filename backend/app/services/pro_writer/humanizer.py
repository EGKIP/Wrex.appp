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
    """Make a chat-completions request, log token usage, and return the content string."""
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

    usage = data.get("usage", {})
    logger.info(
        "openai_tokens",
        extra={
            "service": "humanize",
            "model": settings.openai_model,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        },
    )
    return data["choices"][0]["message"]["content"]


_TONE_PROMPTS: dict[str, str] = {
    "natural": (
        "You are a writing editor who specialises in making AI-generated text sound natural "
        "and human-written. Preserve the meaning but vary sentence structure, reduce repetition, "
        "and use more conversational transitions."
    ),
    "narrative": (
        "You are a writing editor who rewrites text in a rich narrative style — story-driven, "
        "first-person where appropriate, vivid and engaging. Use scene-setting language, "
        "anecdotes, and personal voice while preserving all core arguments and facts."
    ),
    "speech": (
        "You are a writing editor who rewrites text as a spoken presentation or speech. "
        "Use short, punchy sentences. Speak directly to the audience using 'you' and 'we'. "
        "Add rhetorical questions and natural pauses (em dashes). Keep it energetic and clear."
    ),
    "academic": (
        "You are a writing editor who rewrites text in formal academic style. "
        "Use hedging language ('it can be argued', 'evidence suggests'), passive voice where appropriate, "
        "complex noun phrases, and structured paragraph signposting. Avoid contractions entirely."
    ),
    "persuasive": (
        "You are a writing editor who rewrites text in a persuasive, argument-forward style. "
        "Use strong rhetorical devices: rule of three, anaphora, direct address, and emotional appeal. "
        "Every paragraph should build toward a clear call to action or conclusion."
    ),
}

_JSON_INSTRUCTION = (
    " Return a JSON object with two keys: "
    "'rewritten' (the full rewritten text) and "
    "'changes_summary' (one sentence describing what you changed). "
    "No markdown, just raw JSON."
)


def humanize_text(text: str, tone: str = "natural") -> HumanizeResponse:
    """Rewrite the text to sound more natural/human in the requested tone."""
    tone_key = tone.lower() if tone and tone.lower() in _TONE_PROMPTS else "natural"
    system = _TONE_PROMPTS[tone_key] + _JSON_INSTRUCTION
    user = f"Original text:\n{text}"

    try:
        raw = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        data: dict = json.loads(raw)
        return HumanizeResponse(
            rewritten=str(data.get("rewritten", "")),
            changes_summary=str(data.get("changes_summary", "")),
        )
    except Exception as exc:
        logger.error("humanize_error", extra={"error": str(exc), "tone": tone_key})
        raise
