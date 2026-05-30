"""
Rubric rewriter service — calls GPT-4o mini to rewrite text aligned to a rubric.
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
from app.schemas.pro import RubricRewriteResponse

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
            "service": "rubric_rewrite",
            "model": settings.openai_model,
            "prompt_tokens": usage["prompt_tokens"],
            "completion_tokens": usage["completion_tokens"],
            "total_tokens": usage["total_tokens"],
        },
    )
    return data["choices"][0]["message"]["content"], usage


def rewrite_for_rubric(text: str, rubric: str) -> tuple[RubricRewriteResponse, OpenAITokenUsage]:
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
        raw, usage = _chat([{"role": "system", "content": system}, {"role": "user", "content": user}])
        try:
            data: dict = json.loads(_strip_code_fences(raw))
        except json.JSONDecodeError:
            logger.error("rubric_rewrite_json_parse_error", extra={"raw_preview": raw[:200]})
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI returned an unexpected response. Please try again.",
            )
        criteria = data.get("criteria_addressed", [])
        if not isinstance(criteria, list):
            criteria = []
        return (
            RubricRewriteResponse(
                rewritten=str(data.get("rewritten", "") or raw),
                criteria_addressed=[str(c) for c in criteria],
            ),
            usage,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("rubric_rewrite_error", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI writing service is unavailable. Please try again shortly.",
        ) from exc
