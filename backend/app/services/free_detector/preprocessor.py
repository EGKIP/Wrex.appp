import re
from dataclasses import dataclass

# Common abbreviations that end with a period but do NOT end a sentence.
_ABBREVIATIONS = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "approx",
    "dept", "est", "fig", "govt", "inc", "ltd", "max", "min", "no", "orig",
    "pp", "pub", "qty", "ref", "rev", "st", "vol", "e.g", "i.e", "u.s",
    "u.s.a", "u.k", "jan", "feb", "mar", "apr", "jun", "jul", "aug",
    "sep", "oct", "nov", "dec",
}

# Matches a period (or ! or ?) followed by whitespace — candidate split point.
_SPLIT_CANDIDATE = re.compile(r"([.!?])\s+")

WORD_PATTERN = re.compile(r"\b[\w']+\b")


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences while ignoring abbreviations and decimals."""
    parts: list[str] = []
    last = 0
    for match in _SPLIT_CANDIDATE.finditer(text):
        end = match.start(1) + 1  # position just after the punctuation mark
        candidate = text[last:end].strip()

        # Get the word immediately before the punctuation character.
        preceding = re.search(r"(\S+)$", text[last : match.start(1)])
        token = preceding.group(1).rstrip(".!?").lower() if preceding else ""

        # Skip split if: abbreviation, single uppercase letter (e.g. "A."), or decimal.
        is_abbrev = token in _ABBREVIATIONS
        is_initial = len(token) == 1 and token.isalpha()
        is_decimal = bool(re.search(r"[0-9]\.$", text[last : match.start(1) + 1]))

        if is_abbrev or is_initial or is_decimal:
            continue

        if candidate:
            parts.append(candidate)
        last = match.end()

    # Append whatever remains after the last split.
    tail = text[last:].strip()
    if tail:
        parts.append(tail)

    return parts or [text.strip()]


@dataclass
class ProcessedText:
    raw_text: str
    clean_text: str
    sentences: list[str]
    words: list[str]


def preprocess_text(raw_text: str) -> ProcessedText:
    clean_text = re.sub(r"\s+", " ", raw_text.strip())
    sentences = _split_sentences(clean_text)
    words = WORD_PATTERN.findall(clean_text.lower())
    return ProcessedText(
        raw_text=raw_text,
        clean_text=clean_text,
        sentences=sentences,
        words=words,
    )
