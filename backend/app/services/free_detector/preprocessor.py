import re
from dataclasses import dataclass


SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")
WORD_PATTERN = re.compile(r"\b[\w']+\b")


@dataclass
class ProcessedText:
    raw_text: str
    clean_text: str
    sentences: list[str]
    words: list[str]


def preprocess_text(raw_text: str) -> ProcessedText:
    clean_text = re.sub(r"\s+", " ", raw_text.strip())
    sentences = [
        sentence.strip()
        for sentence in SENTENCE_SPLIT_PATTERN.split(clean_text)
        if sentence.strip()
    ]
    words = WORD_PATTERN.findall(clean_text.lower())
    return ProcessedText(
        raw_text=raw_text,
        clean_text=clean_text,
        sentences=sentences,
        words=words,
    )
