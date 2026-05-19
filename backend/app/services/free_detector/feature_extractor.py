from collections import Counter
from dataclasses import dataclass
from math import sqrt
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
    "for this reason", "with this in mind", "by contrast", "similarly",
    "in the same way", "above all", "as previously mentioned", "in essence",
    "in doing so", "taken together", "when considering", "looking at",
    "in today's world", "in today's society",
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

# Common formulaic phrases seen in generic AI-assisted prose.
FORMULAIC_PHRASES = {
    "in today's society", "in today's world", "in the modern world",
    "in the ever-evolving", "ever-evolving landscape", "a crucial role",
    "a vital role", "a key role", "plays a crucial role", "plays a vital role",
    "plays a key role", "it is important to note", "it is worth noting",
    "it should be noted", "cannot be overstated", "serves as a testament",
    "a testament to", "delve into", "shed light on", "foster a deeper",
    "deeper understanding", "the realm of", "the landscape of",
    "navigate the complexities", "multifaceted", "tapestry", "underscore",
    "underscores the importance", "highlight the importance", "pivotal",
    "robust", "seamless", "holistic", "transformative", "meaningful impact",
}

GENERIC_WORDS = {
    "important", "significant", "various", "numerous", "different", "many",
    "some", "several", "overall", "essential", "crucial", "vital", "key",
    "effective", "valuable", "meaningful", "positive", "negative", "better",
    "thing", "things", "aspect", "aspects", "factor", "factors", "issue",
    "issues", "people", "individuals", "society", "community", "world",
    "today", "modern", "process", "approach", "solution", "impact",
    "experience", "concept", "idea", "topic",
}

BE_VERBS = {
    "am", "is", "are", "was", "were", "be", "being", "been",
}

IRREGULAR_PARTICIPLES = {
    "made", "known", "seen", "done", "given", "taken", "shown", "built",
    "found", "kept", "left", "held", "written", "driven", "drawn", "grown",
    "thrown", "spoken", "chosen", "broken", "created", "used", "designed",
}

NGRAM_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "have", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
    "was", "were", "with",
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
    transition_phrase_hits: int = 0
    formulaic_phrase_count: int = 0
    has_passive_hint: bool = False
    generic_word_ratio: float = 0.0
    repeated_phrase_ratio: float = 0.0


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
    formulaic_phrase_count: int = 0
    passive_sentence_count: int = 0
    generic_word_ratio: float = 0.0
    sentence_burstiness: float = 0.0
    repeated_phrase_ratio: float = 0.0


def _count_phrase_hits(text: str, phrases: set[str]) -> int:
    return sum(text.count(phrase) for phrase in phrases)


def _has_transition_opener(words: list[str], sentence_lower: str) -> bool:
    opener = " ".join(words[:8])
    stripped_opener = opener
    if words and words[0] in {"first", "second", "third", "last", "lastly", "finally"}:
        stripped_opener = " ".join(words[:9])

    return any(
        stripped_opener.startswith(phrase)
        or opener.startswith(phrase)
        or sentence_lower.startswith(phrase)
        for phrase in TRANSITION_PHRASES
    )


def _has_passive_hint(words: list[str]) -> bool:
    for index, word in enumerate(words[:-1]):
        if word not in BE_VERBS:
            continue
        next_word = words[index + 1]
        if (
            next_word.endswith("ed")
            or next_word.endswith("en")
            or next_word in IRREGULAR_PARTICIPLES
        ):
            return True
    return False


def _content_ngrams(words: list[str], size: int) -> list[tuple[str, ...]]:
    ngrams: list[tuple[str, ...]] = []
    for index in range(len(words) - size + 1):
        ngram = tuple(words[index:index + size])
        if any(word not in NGRAM_STOPWORDS for word in ngram):
            ngrams.append(ngram)
    return ngrams


def extract_features(processed: ProcessedText) -> DocumentFeatures:
    # ── First pass: collect raw per-sentence data ──────────────────────────────
    sentence_lengths: list[int] = []
    raw: list[dict] = []
    transition_count = 0
    hedging_count = 0
    formulaic_count = 0
    passive_sentence_count = 0
    generic_word_count = 0
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

        sent_lower = sentence.lower()
        transition_phrase_hits = _count_phrase_hits(sent_lower, TRANSITION_PHRASES)
        generic_transition_opener = _has_transition_opener(words, sent_lower)
        if generic_transition_opener:
            transition_count += 1

        has_hedging = any(phrase in sent_lower for phrase in HEDGING_PHRASES)
        if has_hedging:
            hedging_count += 1

        formulaic_phrase_hits = _count_phrase_hits(sent_lower, FORMULAIC_PHRASES)
        formulaic_count += formulaic_phrase_hits

        has_passive_hint = _has_passive_hint(words)
        if has_passive_hint:
            passive_sentence_count += 1

        unique_terms = len(set(words))
        uniqueness_score = unique_terms / word_count if word_count else 0.0
        sentence_generic_count = sum(1 for word in words if word in GENERIC_WORDS)
        generic_word_count += sentence_generic_count
        generic_word_ratio = sentence_generic_count / word_count if word_count else 0.0

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
            "transition_phrase_hits": transition_phrase_hits,
            "formulaic_phrase_count": formulaic_phrase_hits,
            "has_passive_hint": has_passive_hint,
            "generic_word_ratio": round(generic_word_ratio, 3),
            "words": words,
        })

    # ── Document-level stats ───────────────────────────────────────────────────
    avg_sentence_length = mean(sentence_lengths) if sentence_lengths else 18.0
    normalizer = max(avg_sentence_length, 6.0)
    sentence_length_variance = (
        pvariance(sentence_lengths) if len(sentence_lengths) > 1 else 0.0
    )
    sentence_burstiness = (
        sqrt(sentence_length_variance) / avg_sentence_length
        if avg_sentence_length else 0.0
    )

    opener_diversity = (
        len(set(opener_words)) / len(opener_words) if opener_words else 1.0
    )

    all_ngrams: list[tuple[str, ...]] = []
    for r in raw:
        all_ngrams.extend(_content_ngrams(r["words"], 2))
        all_ngrams.extend(_content_ngrams(r["words"], 3))
    ngram_counts = Counter(all_ngrams)
    repeated_ngrams = {
        ngram for ngram, count in ngram_counts.items()
        if count > 1 and len(set(ngram)) > 1
    }
    repeated_ngram_hits = sum(ngram_counts[ngram] for ngram in repeated_ngrams)
    repeated_phrase_ratio = (
        repeated_ngram_hits / len(all_ngrams) if all_ngrams else 0.0
    )

    # ── Second pass: build SentenceFeatures with document-relative uniformity ─
    sentence_features: list[SentenceFeatures] = []
    for r in raw:
        deviation = abs(r["word_count"] - avg_sentence_length) / normalizer
        uniform_structure_score = round(max(0.0, 1.0 - deviation), 3)
        sentence_ngrams = _content_ngrams(r["words"], 2) + _content_ngrams(r["words"], 3)
        repeated_sentence_ngrams = sum(
            1 for ngram in sentence_ngrams if ngram in repeated_ngrams
        )
        sentence_repeated_phrase_ratio = (
            repeated_sentence_ngrams / len(sentence_ngrams) if sentence_ngrams else 0.0
        )
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
                transition_phrase_hits=r["transition_phrase_hits"],
                formulaic_phrase_count=r["formulaic_phrase_count"],
                has_passive_hint=r["has_passive_hint"],
                generic_word_ratio=r["generic_word_ratio"],
                repeated_phrase_ratio=round(sentence_repeated_phrase_ratio, 3),
            )
        )

    document_counts = Counter(processed.words)
    word_count = len(processed.words)
    vocabulary_diversity = len(document_counts) / word_count if word_count else 0.0
    repetition_index = (
        sum(count - 1 for count in document_counts.values() if count > 1) / word_count
        if word_count else 0.0
    )
    generic_word_ratio = generic_word_count / word_count if word_count else 0.0
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
        formulaic_phrase_count=formulaic_count,
        passive_sentence_count=passive_sentence_count,
        generic_word_ratio=round(generic_word_ratio, 3),
        sentence_burstiness=round(sentence_burstiness, 3),
        repeated_phrase_ratio=round(repeated_phrase_ratio, 3),
    )
