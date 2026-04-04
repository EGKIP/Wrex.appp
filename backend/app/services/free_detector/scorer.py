from app.services.free_detector.feature_extractor import DocumentFeatures


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def score_document(features: DocumentFeatures) -> tuple[int, str]:
    # Lower variance threshold: AI text clusters at <35, human text typically >50
    sentence_consistency = clamp(1 - (features.sentence_length_variance / 55), 0, 1)

    # Amplify transition signal — proportion of sentences with generic openers
    transition_signal = clamp(
        features.transition_phrase_count / max(features.sentence_count, 1) * 2.5, 0, 1
    )

    # Lower diversity threshold — AI text often sits at 0.45–0.55
    vocabulary_signal = clamp((0.62 - features.vocabulary_diversity) / 0.28, 0, 1)

    # Slightly tighter repetition threshold
    repetition_signal = clamp(features.repetition_index / 0.28, 0, 1)

    # Hedging phrases are a reliable AI signal
    hedging_signal = clamp(
        features.hedging_phrase_count / max(features.sentence_count, 1) * 3.5, 0, 1
    )

    # Low opener diversity = many sentences start the same way (AI pattern)
    opener_diversity_signal = clamp((0.75 - features.opener_diversity) / 0.55, 0, 1)

    # Punctuation variety is a weak but real signal
    punctuation_signal = clamp((0.5 - features.punctuation_diversity) / 0.5, 0, 1)

    weighted_score = (
        sentence_consistency * 0.22
        + transition_signal * 0.20
        + vocabulary_signal * 0.18
        + repetition_signal * 0.15
        + hedging_signal * 0.13
        + opener_diversity_signal * 0.08
        + punctuation_signal * 0.04
    )

    score = int(round(clamp(weighted_score, 0, 1) * 100))

    if score >= 70:
        confidence = "High"
    elif score >= 40:
        confidence = "Medium"
    else:
        confidence = "Low"

    return score, confidence
