from app.core.config import settings
from app.core.rate_limit import get_rate_limit_context
from app.schemas.free import AnalyzeResponse, DocumentStats, ProPrompt
from app.services.free_detector.feature_extractor import extract_features
from app.services.free_detector.preprocessor import preprocess_text
from app.services.free_detector.red_flags import build_flagged_sentences, build_red_flags
from app.services.free_detector.scorer import score_document


def validate_text(text: str) -> str:
    cleaned = text.strip()
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


def analyze_document(text: str) -> AnalyzeResponse:
    validate_text(text)
    _rate_limit_context = get_rate_limit_context()

    processed = preprocess_text(text)
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
                "Get deeper writing suggestions, grammar help, humanizing edits, "
                "and rubric-based guidance with the Pro writing model."
            ),
            cta_label="Unlock Pro Writing Tools",
        ),
    )
