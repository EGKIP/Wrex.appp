"""
Input sanitisation for user-supplied text.

Goals:
- Strip null bytes and non-printable control characters (keep \\t, \\n, \\r).
- Remove HTML/script-like tags to prevent prompt injection via markup.
- Normalise unicode to NFKC (collapse ligatures, fullwidth chars, etc.).
- Collapse runs of blank lines to at most two consecutive newlines.
- Return clean, stripped text ready for NLP processing.
"""

import re
import unicodedata

# Matches any ASCII control character except tab (\\x09), LF (\\x0A), CR (\\x0D).
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Very loose HTML-tag pattern — catches <script>, <img src=...>, etc.
_HTML_TAGS = re.compile(r"<[^>]{0,200}>", re.IGNORECASE)

# Collapse 3+ consecutive newlines to 2.
_EXCESS_NEWLINES = re.compile(r"\n{3,}")

# Collapse runs of spaces/tabs (but not newlines) to a single space.
_INLINE_WHITESPACE = re.compile(r"[ \t]+")


def sanitize(raw: str) -> str:
    """
    Return a sanitised copy of *raw*.

    Steps applied in order:
    1. Unicode NFKC normalisation.
    2. Strip HTML-like tags.
    3. Remove control characters (null bytes, BEL, BS, …).
    4. Collapse excessive inline whitespace and blank lines.
    5. Strip leading/trailing whitespace.
    """
    if not isinstance(raw, str):
        return ""

    # 1. Normalise unicode
    text = unicodedata.normalize("NFKC", raw)

    # 2. Remove HTML-like markup
    text = _HTML_TAGS.sub(" ", text)

    # 3. Strip control characters
    text = _CONTROL_CHARS.sub("", text)

    # 4. Tidy whitespace
    # Collapse inline spaces/tabs first, then excessive newlines
    lines = [_INLINE_WHITESPACE.sub(" ", line) for line in text.splitlines()]
    text = "\n".join(lines)
    text = _EXCESS_NEWLINES.sub("\n\n", text)

    # 5. Strip
    return text.strip()

