"""
Writing improvement service — calls GPT-4o mini to suggest sentence rewrites.
"""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Optional

from fastapi import HTTPException, status

from app.core.credits import OpenAITokenUsage
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.pro import ImproveSuggestion

logger = get_logger(__name__)

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = 30


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers GPT sometimes adds despite instructions."""
    stripped = re.sub(r"^```[a-z]*\s*", "", text.strip(), flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped.strip())
    return stripped.strip()


def _chat(messages: list[dict]) -> tuple[str, OpenAITokenUsage]:
    """Make a single chat-completions request and return content plus token usage."""
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
            "service": "improve",
            "model": settings.openai_model,
            "prompt_tokens": usage["prompt_tokens"],
            "completion_tokens": usage["completion_tokens"],
            "total_tokens": usage["total_tokens"],
        },
    )
    return data["choices"][0]["message"]["content"], usage


def get_improve_suggestions(
    text: str, rubric: Optional[str] = None
) -> tuple[list[ImproveSuggestion], OpenAITokenUsage]:
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
        raw, usage = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        try:
            items: list[dict] = json.loads(_strip_code_fences(raw))
        except json.JSONDecodeError:
            logger.error("improve_json_parse_error", extra={"raw_preview": raw[:200]})
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI returned an unexpected response. Please try again.",
            )
        if not isinstance(items, list):
            items = []
        return (
            [
                ImproveSuggestion(
                    sentence=str(i.get("sentence", "")),
                    issue=str(i.get("issue", "")),
                    rewrite=str(i.get("rewrite", "")),
                )
                for i in items
                if isinstance(i, dict)
                and i.get("sentence") and i.get("rewrite")
            ],
            usage,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("improve_error", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI writing service is unavailable. Please try again shortly.",
        ) from exc
