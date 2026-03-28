from app.services.free_detector.feature_extractor import DocumentFeatures


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def score_document(features: DocumentFeatures) -> tuple[int, str]:
    sentence_consistency = clamp(1 - (features.sentence_length_variance / 90), 0, 1)
    transition_signal = clamp(features.transition_phrase_count / max(features.sentence_count, 1), 0, 1)
    vocabulary_signal = clamp((0.55 - features.vocabulary_diversity) / 0.35, 0, 1)
    repetition_signal = clamp(features.repetition_index / 0.35, 0, 1)
    punctuation_signal = clamp((0.5 - features.punctuation_diversity) / 0.5, 0, 1)

    weighted_score = (
        sentence_consistency * 0.28
        + transition_signal * 0.22
        + vocabulary_signal * 0.2
        + repetition_signal * 0.18
        + punctuation_signal * 0.12
    )

    score = int(round(clamp(weighted_score, 0, 1) * 100))

    if score >= 75:
        confidence = "High"
    elif score >= 45:
        confidence = "Medium"
    else:
        confidence = "Low"

    return score, confidence
