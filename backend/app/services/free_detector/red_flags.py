from app.services.free_detector.feature_extractor import DocumentFeatures, SentenceFeatures


def build_red_flags(features: DocumentFeatures) -> list[str]:
    flags: list[str] = []

    if features.sentence_length_variance <= 25:
        flags.append("Sentence lengths are unusually consistent.")
    if features.transition_phrase_count >= 2:
        flags.append("Several sentences begin with generic transition phrases.")
    if features.vocabulary_diversity <= 0.5:
        flags.append("Vocabulary variation is lower than expected.")
    if features.repetition_index >= 0.22:
        flags.append("Repeated wording appears more often than expected.")

    return flags[:4] or ["The overall score is driven by a blend of subtle document-level patterns."]


def build_flagged_sentences(sentence_features: list[SentenceFeatures]) -> list[dict[str, object]]:
    flagged: list[dict[str, object]] = []

    for feature in sentence_features:
        score = (
            feature.repeated_word_ratio * 0.35
            + (0.35 if feature.generic_transition_opener else 0)
            + (1 - feature.uniqueness_score) * 0.15
            + feature.uniform_structure_score * 0.15
        )
        if score >= 0.45:
            reasons: list[str] = []
            if feature.generic_transition_opener:
                reasons.append("generic transition-heavy phrasing")
            if feature.repeated_word_ratio >= 0.18:
                reasons.append("repeated wording")
            if feature.uniform_structure_score >= 0.7:
                reasons.append("predictable structure")
            if feature.uniqueness_score <= 0.6:
                reasons.append("lower uniqueness")

            flagged.append(
                {
                    "index": feature.index,
                    "text": feature.text,
                    "score": round(min(score, 0.99), 2),
                    "reason": f"Signals include {', '.join(reasons)}."
                    if reasons
                    else "This sentence follows a highly uniform phrasing pattern.",
                }
            )

    return flagged[:5]
