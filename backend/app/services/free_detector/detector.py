from __future__ import annotations

import time
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import get_rate_limit_context
from app.core.sanitizer import sanitize
from app.schemas.free import AnalyzeResponse, DocumentStats, ProPrompt
from app.services.free_detector.feature_extractor import DocumentFeatures, extract_features
from app.services.free_detector.preprocessor import preprocess_text
from app.services.free_detector.red_flags import build_flagged_sentences, build_red_flags
from app.services.free_detector.scorer import score_document
from app.services.rubric_matcher.matcher import match_rubric

logger = get_logger(__name__)


def validate_text(raw: str) -> str:
    """Sanitise and validate the user-submitted text. Returns clean text or raises ValueError."""
    cleaned = sanitize(raw)
    if not cleaned:
        raise ValueError("Please paste some writing before analyzing.")

    words = cleaned.split()
    if len(words) < settings.min_text_words:
        raise ValueError(f"Please provide at least {settings.min_text_words} words for a reliable review.")
    if len(words) > settings.max_text_words:
        raise ValueError(f"Please keep analysis under {settings.max_text_words} words for this phase.")

    return cleaned


def generate_summary(score: int) -> str:
    if score >= 75:
        return "This text shows several patterns commonly associated with AI-assisted writing."
    if score >= 45:
        return "This text shows some patterns commonly associated with AI-assisted writing."
    return "This text shows fewer broad signals associated with AI-assisted writing, though the result remains probabilistic."


def build_tips(score: int, features: DocumentFeatures | None = None) -> list[str]:
    """
    Generate context-aware writing tips based on the document's actual feature profile.
    Falls back to a generic set when features are unavailable.
    """
    tips: list[str] = []

    if features is None:
        return [
            "Add specific examples from your own perspective.",
            "Vary sentence openings to create a more natural rhythm.",
            "Mix short and long sentences so the structure feels less uniform.",
            "Replace generic transitions with clearer, more personal phrasing.",
        ]

    # Low sentence-length variance → uniform, machine-like rhythm
    if features.sentence_length_variance < 20:
        tips.append(
            f"Your sentence lengths are very uniform (variance {features.sentence_length_variance:.0f}). "
            "Deliberately mix short punchy sentences with longer ones to sound more natural."
        )

    # Many generic transitions
    if features.transition_phrase_count >= 3:
        tips.append(
            f"You used {features.transition_phrase_count} generic transition phrases "
            "(e.g. 'moreover', 'furthermore', 'in conclusion'). "
            "Replace them with specific connectors that reflect your actual argument."
        )

    # High repetition index → repeated vocabulary
    if features.repetition_index > 0.30:
        tips.append(
            f"About {round(features.repetition_index * 100)}% of your words are repeated. "
            "Try varying your vocabulary — use synonyms or restructure repeated ideas."
        )

    # Low vocabulary diversity
    if features.vocabulary_diversity < 0.55:
        tips.append(
            "Your vocabulary diversity is relatively low. "
            "Aim for more varied word choices to give the writing a richer, more human feel."
        )

    # Many flagged sentences
    flagged_count = sum(
        1 for sf in features.sentence_features if sf.uniqueness_score < 0.4
    )
    if flagged_count >= 3:
        tips.append(
            f"{flagged_count} sentences showed high AI-pattern signals. "
            "Rewrite them in your own voice — add personal observations, concrete details, or examples."
        )

    # High score with few other tips → add a general humanising tip
    if score >= 50 and len(tips) < 2:
        tips.append(
            "Add a specific personal anecdote, data point, or example to anchor your argument "
            "in real experience rather than general statements."
        )

    # Always give at least one practical tip
    if not tips:
        tips.append(
            "Your writing looks solid. To push it further, add a unique personal angle "
            "or a concrete real-world example that only you could write."
        )

    return tips[:4]


def analyze_document(text: str, rubric: Optional[str] = None) -> AnalyzeResponse:
    cleaned_text = validate_text(text)
    # Rate-limit context is prepared for Phase 1.5 (Supabase auth + quotas)
    get_rate_limit_context()

    t0 = time.perf_counter()

    processed = preprocess_text(cleaned_text)
    features = extract_features(processed)
    score, confidence = score_document(features)

    stats = DocumentStats(
        word_count=features.word_count,
        sentence_count=features.sentence_count,
        avg_sentence_length=features.avg_sentence_length,
        sentence_length_variance=features.sentence_length_variance,
        vocabulary_diversity=features.vocabulary_diversity,
        repetition_index=features.repetition_index,
        punctuation_diversity=features.punctuation_diversity,
        transition_phrase_count=features.transition_phrase_count,
    )

    rubric_result = None
    clean_rubric = sanitize(rubric) if rubric else None
    if clean_rubric:
        raw = match_rubric(draft=cleaned_text, rubric=clean_rubric)
        from app.schemas.free import CriterionResult, RubricMatchResult  # local to avoid circular
        rubric_result = RubricMatchResult(
            overall_score=raw.overall_score,
            strong_count=raw.strong_count,
            partial_count=raw.partial_count,
            missing_count=raw.missing_count,
            summary=raw.summary,
            criteria=[
                CriterionResult(
                    criterion=c.criterion,
                    coverage=c.coverage,
                    score=c.score,
                    matched_terms=c.matched_terms,
                    total_terms=c.total_terms,
                )
                for c in raw.criteria
            ],
        )

    duration_ms = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(
        "analyze_complete",
        extra={
            "score": score,
            "confidence": confidence,
            "word_count": features.word_count,
            "has_rubric": rubric_result is not None,
            "duration_ms": duration_ms,
        },
    )

    return AnalyzeResponse(
        score=score,
        confidence=confidence,
        summary=generate_summary(score),
        stats=stats,
        red_flags=build_red_flags(features),
        flagged_sentences=build_flagged_sentences(features.sentence_features),
        basic_tips=build_tips(score, features),
        pro_prompt=ProPrompt(
            title="Improve this writing with Pro",
            message=(
                "Get deeper rewrite suggestions, gap detection, "
                "and humanizing support with Pro."
            ),
            cta_label="Explore Pro",
        ),
        rubric_result=rubric_result,
    )
