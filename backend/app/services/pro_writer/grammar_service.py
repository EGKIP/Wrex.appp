"""
Grammar check service — proxies the LanguageTool public API.

No API key required for the public API (rate-limited at ~20 req/min per IP).
Docs: https://languagetool.org/http-api/
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

from app.core.logging import get_logger

logger = get_logger(__name__)

LANGUAGETOOL_URL = "https://api.languagetool.org/v2/check"
_TIMEOUT = 10  # seconds


@dataclass
class GrammarMatch:
    offset: int
    length: int
    message: str
    replacements: list[str]
    match_type: str   # "error" | "suggestion"
    rule_id: str
    context_text: str = field(default="")


def _classify_type(issue_type: str, rule_id: str) -> str:
    """Map LanguageTool issueType → our error | suggestion categories."""
    if issue_type in ("misspelling", "typographical"):
        return "error"
    if rule_id.startswith("MORFOLOGIK") or rule_id.startswith("HUNSPELL"):
        return "error"
    return "suggestion"


def check_grammar(text: str, language: str = "en-US") -> list[GrammarMatch]:
    """Call LanguageTool and return a list of GrammarMatch objects.

    Returns an empty list on timeout or API errors (non-blocking).
    """
    if not text or not text.strip():
        return []

    encoded = urllib.parse.urlencode({
        "text": text,
        "language": language,
        "enabledOnly": "false",
    }).encode("utf-8")

    req = urllib.request.Request(
        LANGUAGETOOL_URL,
        data=encoded,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "User-Agent": "WrexApp/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data: dict = json.loads(resp.read().decode("utf-8"))
    except TimeoutError:
        logger.warning("languagetool_timeout")
        return []
    except Exception as exc:
        logger.warning("languagetool_error", extra={"error": str(exc)})
        return []

    matches: list[GrammarMatch] = []
    for m in data.get("matches", []):
        rule = m.get("rule", {})
        issue_type: str = rule.get("issueType", "")
        rule_id: str = rule.get("id", "")
        context: str = m.get("context", {}).get("text", "")
        replacements = [r["value"] for r in m.get("replacements", [])[:5]]

        matches.append(
            GrammarMatch(
                offset=int(m.get("offset", 0)),
                length=int(m.get("length", 0)),
                message=str(m.get("message", "")),
                replacements=replacements,
                match_type=_classify_type(issue_type, rule_id),
                rule_id=rule_id,
                context_text=context,
            )
        )

    logger.info(
        "grammar_check_complete",
        extra={"match_count": len(matches), "text_len": len(text)},
    )
    return matches
