"""
Humanizer service — calls GPT-4o mini to rewrite AI-sounding text more naturally.
"""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from fastapi import HTTPException, status

from app.core.credits import OpenAITokenUsage
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.pro import HumanizeResponse

logger = get_logger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = 30


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers GPT sometimes adds despite instructions."""
    stripped = re.sub(r"^```[a-z]*\s*", "", text.strip(), flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped.strip())
    return stripped.strip()


def _chat(messages: list[dict]) -> tuple[str, OpenAITokenUsage]:
    """Make a chat-completions request and return content plus token usage."""
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
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode(errors="replace")
        logger.error("openai_http_error", extra={"status": exc.code, "body": body_text[:300]})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error ({exc.code}). Please try again shortly.",
        ) from exc

    usage: OpenAITokenUsage = {
        "prompt_tokens": int(data.get("usage", {}).get("prompt_tokens", 0)),
        "completion_tokens": int(data.get("usage", {}).get("completion_tokens", 0)),
        "total_tokens": int(data.get("usage", {}).get("total_tokens", 0)),
    }
    logger.info(
        "openai_tokens",
        extra={
            "service": "humanize",
            "model": settings.openai_model,
            "prompt_tokens": usage["prompt_tokens"],
            "completion_tokens": usage["completion_tokens"],
            "total_tokens": usage["total_tokens"],
        },
    )
    return data["choices"][0]["message"]["content"], usage


_TONE_PROMPTS: dict[str, str] = {
    "natural": (
        "You are a writing editor who specialises in making generic text sound natural "
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


def humanize_text(text: str, tone: str = "natural") -> tuple[HumanizeResponse, OpenAITokenUsage]:
    """Rewrite the text to sound more natural/human in the requested tone."""
    tone_key = tone.lower() if tone and tone.lower() in _TONE_PROMPTS else "natural"
    system = _TONE_PROMPTS[tone_key] + _JSON_INSTRUCTION
    user = f"Original text:\n{text}"

    try:
        raw, usage = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        try:
            data: dict = json.loads(_strip_code_fences(raw))
        except json.JSONDecodeError:
            logger.error("humanize_json_parse_error", extra={"tone": tone_key, "raw_preview": raw[:200]})
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI returned an unexpected response. Please try again.",
            )
        return (
            HumanizeResponse(
                rewritten=str(data.get("rewritten", "") or raw),
                changes_summary=str(data.get("changes_summary", "")),
            ),
            usage,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("humanize_error", extra={"error": str(exc), "tone": tone_key})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI writing service is unavailable. Please try again shortly.",
        ) from exc
