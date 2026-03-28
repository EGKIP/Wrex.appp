import time
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import get_rate_limit_context
from app.core.sanitizer import sanitize
from app.schemas.free import AnalyzeResponse, DocumentStats, ProPrompt
from app.services.free_detector.feature_extractor import extract_features
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


def build_tips(score: int) -> list[str]:
    tips = [
        "Add specific examples from your own perspective.",
        "Vary sentence openings to create a more natural rhythm.",
        "Mix short and long sentences so the structure feels less uniform.",
    ]
    if score >= 45:
        tips.append("Replace generic transitions with clearer, more personal phrasing.")
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
        basic_tips=build_tips(score),
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
