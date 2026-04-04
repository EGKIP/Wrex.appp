from collections import Counter
from dataclasses import dataclass
from statistics import mean, pvariance

from app.services.free_detector.preprocessor import ProcessedText, WORD_PATTERN

# Expanded transition phrases — classic AI sentence openers
TRANSITION_PHRASES = {
    "moreover", "however", "in conclusion", "therefore", "furthermore",
    "in addition", "overall", "additionally", "on the other hand",
    "consequently", "as a result", "thus", "hence", "nevertheless",
    "nonetheless", "in contrast", "on the contrary", "in summary",
    "to summarize", "in other words", "for instance", "for example",
    "to begin with", "first of all", "lastly", "finally", "in particular",
    "specifically", "notably", "despite this", "while it is true",
    "it is clear that", "one could argue", "undoubtedly", "it is important",
    "this highlights", "this demonstrates", "this illustrates", "this suggests",
    "it is worth noting", "it should be noted", "it can be argued",
}

# Hedging / softening phrases typical of AI-generated writing
HEDGING_PHRASES = {
    "it is important to", "it should be noted", "it can be argued",
    "it is worth noting", "it is clear that", "it is evident that",
    "it seems that", "it appears that", "one could argue", "one might argue",
    "this suggests that", "this indicates that", "this demonstrates that",
    "this is particularly", "this highlights", "while it is true",
    "despite the fact", "undoubtedly", "it is generally", "it is widely",
    "it is commonly", "it is often", "it is crucial", "it is essential",
    "plays a crucial role", "plays an important role", "plays a key role",
    "it is vital", "it is necessary", "as mentioned", "as discussed",
}


@dataclass
class SentenceFeatures:
    index: int
    text: str
    word_count: int
    repeated_word_ratio: float
    generic_transition_opener: bool
    uniqueness_score: float
    uniform_structure_score: float
    has_hedging: bool = False


@dataclass
class DocumentFeatures:
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    sentence_length_variance: float
    vocabulary_diversity: float
    repetition_index: float
    transition_phrase_count: int
    punctuation_diversity: float
    sentence_features: list[SentenceFeatures]
    hedging_phrase_count: int = 0
    opener_diversity: float = 1.0


def extract_features(processed: ProcessedText) -> DocumentFeatures:
    # ── First pass: collect raw per-sentence data ──────────────────────────────
    sentence_lengths: list[int] = []
    raw: list[dict] = []
    transition_count = 0
    hedging_count = 0
    opener_words: list[str] = []

    for index, sentence in enumerate(processed.sentences):
        words = WORD_PATTERN.findall(sentence.lower())
        word_count = len(words)
        sentence_lengths.append(word_count)

        counts = Counter(words)
        repeated_word_ratio = (
            sum(count - 1 for count in counts.values() if count > 1) / word_count
            if word_count else 0.0
        )

        # Check opener against 4-word prefix for better phrase matching
        opener = " ".join(words[:5])
        sent_lower = sentence.lower()
        generic_transition_opener = any(
            opener.startswith(phrase) or sent_lower.startswith(phrase)
            for phrase in TRANSITION_PHRASES
        )
        if generic_transition_opener:
            transition_count += 1

        has_hedging = any(phrase in sent_lower for phrase in HEDGING_PHRASES)
        if has_hedging:
            hedging_count += 1

        unique_terms = len(set(words))
        uniqueness_score = unique_terms / word_count if word_count else 0.0

        opener_word = words[0] if words else ""
        opener_words.append(opener_word)

        raw.append({
            "index": index,
            "text": sentence,
            "word_count": word_count,
            "repeated_word_ratio": round(repeated_word_ratio, 3),
            "generic_transition_opener": generic_transition_opener,
            "uniqueness_score": round(uniqueness_score, 3),
            "has_hedging": has_hedging,
        })

    # ── Document-level stats ───────────────────────────────────────────────────
    avg_sentence_length = mean(sentence_lengths) if sentence_lengths else 18.0
    normalizer = max(avg_sentence_length, 6.0)
    sentence_length_variance = (
        pvariance(sentence_lengths) if len(sentence_lengths) > 1 else 0.0
    )

    opener_diversity = (
        len(set(opener_words)) / len(opener_words) if opener_words else 1.0
    )

    # ── Second pass: build SentenceFeatures with document-relative uniformity ─
    sentence_features: list[SentenceFeatures] = []
    for r in raw:
        deviation = abs(r["word_count"] - avg_sentence_length) / normalizer
        uniform_structure_score = round(max(0.0, 1.0 - deviation), 3)
        sentence_features.append(
            SentenceFeatures(
                index=r["index"],
                text=r["text"],
                word_count=r["word_count"],
                repeated_word_ratio=r["repeated_word_ratio"],
                generic_transition_opener=r["generic_transition_opener"],
                uniqueness_score=r["uniqueness_score"],
                uniform_structure_score=uniform_structure_score,
                has_hedging=r["has_hedging"],
            )
        )

    document_counts = Counter(processed.words)
    word_count = len(processed.words)
    vocabulary_diversity = len(document_counts) / word_count if word_count else 0.0
    repetition_index = (
        sum(count - 1 for count in document_counts.values() if count > 1) / word_count
        if word_count else 0.0
    )
    punctuation_diversity = (
        len({ch for ch in processed.clean_text if ch in ",;:!?-"}) / 6
        if processed.clean_text else 0.0
    )

    return DocumentFeatures(
        word_count=word_count,
        sentence_count=len(processed.sentences),
        avg_sentence_length=round(avg_sentence_length, 1),
        sentence_length_variance=round(sentence_length_variance, 1),
        vocabulary_diversity=round(vocabulary_diversity, 2),
        repetition_index=round(repetition_index, 2),
        transition_phrase_count=transition_count,
        punctuation_diversity=round(punctuation_diversity, 2),
        sentence_features=sentence_features,
        hedging_phrase_count=hedging_count,
        opener_diversity=round(opener_diversity, 3),
    )
