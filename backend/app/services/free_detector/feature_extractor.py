from collections import Counter
from dataclasses import dataclass
from statistics import mean, pvariance

from app.services.free_detector.preprocessor import ProcessedText, WORD_PATTERN

TRANSITION_PHRASES = {
    "moreover",
    "however",
    "in conclusion",
    "therefore",
    "furthermore",
    "in addition",
    "overall",
    "additionally",
    "on the other hand",
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


def extract_features(processed: ProcessedText) -> DocumentFeatures:
    sentence_lengths: list[int] = []
    sentence_features: list[SentenceFeatures] = []
    transition_count = 0

    for index, sentence in enumerate(processed.sentences):
        words = WORD_PATTERN.findall(sentence.lower())
        word_count = len(words)
        sentence_lengths.append(word_count)

        counts = Counter(words)
        repeated_word_ratio = (
            sum(count - 1 for count in counts.values() if count > 1) / word_count
            if word_count
            else 0.0
        )

        opener = " ".join(words[:3])
        generic_transition_opener = any(
            opener.startswith(phrase) or sentence.lower().startswith(phrase)
            for phrase in TRANSITION_PHRASES
        )
        if generic_transition_opener:
            transition_count += 1

        unique_terms = len(set(words))
        uniqueness_score = unique_terms / word_count if word_count else 0.0
        uniform_structure_score = 1 - min(abs(word_count - 18) / 18, 1)

        sentence_features.append(
            SentenceFeatures(
                index=index,
                text=sentence,
                word_count=word_count,
                repeated_word_ratio=round(repeated_word_ratio, 3),
                generic_transition_opener=generic_transition_opener,
                uniqueness_score=round(uniqueness_score, 3),
                uniform_structure_score=round(uniform_structure_score, 3),
            )
        )

    document_counts = Counter(processed.words)
    word_count = len(processed.words)
    vocabulary_diversity = len(document_counts) / word_count if word_count else 0.0
    repetition_index = (
        sum(count - 1 for count in document_counts.values() if count > 1) / word_count
        if word_count
        else 0.0
    )
    punctuation_diversity = (
        len({character for character in processed.clean_text if character in ",;:!?-"})
        / 6
        if processed.clean_text
        else 0.0
    )

    avg_sentence_length = mean(sentence_lengths) if sentence_lengths else 0.0
    sentence_length_variance = pvariance(sentence_lengths) if len(sentence_lengths) > 1 else 0.0

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
    )
